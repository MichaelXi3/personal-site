---
title: Linux Memory Management
description: ""
date: 2023-06-06
tags:
  - Operating System
  - Linux
---

<aside class="callout">

Kernel is not always afforded the capability to easily **allocate memory**.

</aside>

## Pages

<aside class="callout">

The kernel treats <u>physical pages</u> as the <u>basic unit of memory management</u>.

</aside>

- The processor’s smallest addressable unit is a byte or a word, but the memory management unit (**MMU**) usually works with **pages**. The MMU maintains page tables with page-sized granularity for virtual to physical address translations.
- Each architecture defines its own **page size**. Many architectures even support multiple page sizes. Most 32-bit architectures have 4KB pages, whereas most 64-bit architectures have 8KB pages.
- The kernel represents <i>every </i><b><u>physical</u></b> page on the system with a <b>struct page </b>structure. This structure is defined in `<linux/mm_types.h>`.
  ```c
  struct page {
  	unsigned long         flags;
  	atomic_t              _count;
  	atomic_t              _mapcount;
  	unsigned long         private;
    struct address_space  *mapping;
    pgoff_t               index;
  	struct list_head      lru;
  	void                  *virtual;
  };
  ```

  - `flags` field stores the status of the page, e.g. dirty, locked, etc.
  - `_count` field stores the usage count of the page—that is, how many references there are to this page. When this count reaches **negative** one, no one is using the page, and it becomes available for use in a new allocation.
    - Check page count using function call `page_count()`: Although internally `_count` is -1 when the page is free, page\_count() returns zero to indicate free and a positive nonzero integer when the page is in use.
  - A page may be used by the **page cache** (in which case the `mapping` field points to the address\_space object associated with this page), as private data (pointed at by `private`), or as a mapping in a process’s page table.
  - The `virtual` field is the page’s virtual address
  - Kernel uses this structure to keep track of all the pages in the system
- The page structure is tied to <u>physical</u> pages, not virtual pages. This means that what structure describes is **transient** at best. The <mark>data in a page may continue to exist, but it might not always be associated with the same page structure due to swapping and other factors</mark>. The kernel uses this data structure to describe the physical page it's associated with, with the goal of describing physical memory rather than the data it contains.

### Page Allocation

> Interfaces that kernel implements to enable you to allocate and free memory.

<b><mark>Getting Pages</mark></b>

All interfaces allocate memory with **page-sized granularity** and are declared in `<linux/gfp.h>`.

- Allocate pages with page struct pointer return
  ```c
  struct page * alloc_pages(gfp_t gfp_mask, unsigned int order)
  ```

  - This function **2\^order** (that is,1 \<\< order) **contiguous** physical pages and returns a **pointer** to the first page’s `page` structure.
  - This function allocates page from **high memory** returns a struct page and not a pointer to a logical address. Because high memory might not be mapped.
- Convert given pages to its logical address
  ```c
  void * page_address(struct page *page)
  ```
- Allocate pages with logical address return
  ```c
  unsigned long __get_free_pages(gfp_t gfp_mask, unsigned int order)
  ```

<b><mark>Getting Zeroed Pages</mark></b>

Allocates a single page, zero its contents and returns a pointer to its logical address.

```c
unsigned long get_zeroed_page(unsigned int gfp_mask)
```

This is useful for pages given to user-space because the random garbage in an allocated page is not so random; it might contain sensitive data.

<b><mark>Freeing Pages</mark></b>

You must be careful to **free only pages you allocate**. Passing the wrong struct page or address, or the incorrect order, can result in corruption.

```c
void __free_pages(struct page *page, unsigned int order)
void free_pages(unsigned long addr, unsigned int order)
void free_page(unsigned long addr)
```

These low-level page functions are useful when you need page-sized chunks of **physically contiguous pages**. For more general byte-sized allocations, the kernel provides `kmalloc()`.

## Zones

<aside class="callout">

Due to hardware limitations, the kernel cannot treat all pages as identical. Some pages, due to their physical address in memory, cannot be used for certain tasks. To overcome this limitation, the kernel divides pages into different ***zones***. The kernel uses the <mark>zones to group pages with similar properties</mark>. Zones are defined in `<linux/mmzone.h>`.

</aside>

- `ZONE_DMA`—This zone contains pages that can undergo DMA (Direct Memory Access)
- `ZONE_DMA32`—Like ZOME\_DMA, this zone contains pages that can undergo DMA. Unlike ZONE\_DMA, these pages are accessible only by 32-bit devices. On some architectures, this zone is a larger subset of memory.
- `ZONE_NORMAL`—This zone contains normal, regularly mapped, pages.
- `ZONE_HIGHMEM`—This zone contains “high memory,” which are pages not permanently mapped into the kernel’s address space.

---

<ul>

<li>

The actual usage and layout of the memory zones are **architecture-dependent**. The values in the four zones depends on the different kinds of architecture.

![](/images/blog/linux-mm/01.webp)

</li>

<li>

Linux partitions the system’s pages into zones to have a **pooling** in place to satisfy allocations as needed.

- For example, having a ZONE\_DMA pool gives the kernel the capability to satisfy memory allocations needed for DMA.

</li>

</ul>

## `kmalloc`<br />

<aside class="callout">

The `kmalloc()` function’s operation is similar to that of user-space’s familiar `malloc()` routine, with the exception of the additional **flags** parameter.The `kmalloc()` function is a simple interface for obtaining kernel memory in **byte-sized chunks**.

</aside>

```c
void * kmalloc(size_t size, gfp_t flags)
```

> In the C, `size_t` is an **unsigned integer** type that is commonly used to represent sizes and counts of objects. The `size_t` type is guaranteed to be able to represent the **maximum size of any object** that can be allocated in memory. Its size can vary depending on the platform and the implementation, but it is usually defined as an `unsigned long` or `unsigned long long`.

The function returns a **pointer** to a region of memory that is <b>at </b><i><b>least </b></i>**size bytes** in<br />length. The region of memory allocated is <b><u>physically contiguous</u></b>.

### gfp\_mask Flags<br />

<aside class="callout">

Flags are represented by the `gfp_t` type, which is defined in <b>\<linux/types.h></b> as an unsigned int. <i>gfp </i>stands for `__get_free_pages()`.

</aside>

**Three categories**: action modifiers, zone modifiers, and types.

- `Action modifiers`: Action modifiers specify <i>how </i>the kernel is supposed to allocate the requested memory. In certain situations, only certain methods can be employed to allocate memory.
  - For example, interrupt handlers must instruct the kernel not to sleep (because interrupt handlers cannot reschedule) in during allocating memory.

    <details>
    <summary>Action Modifiers Flags</summary>

    ![](/images/blog/linux-mm/02.webp)

    </details>

    ```c
    // This call instructs the page allocator (ultimately alloc_pages()) that the allocation can block, perform I/O, and perform filesystem operations, if needed.
    ptr = kmalloc(size, __GFP_WAIT | __GFP_IO | __GFP_FS);
    ```
- `Zone modifiers` specify from <i>where </i>to allocate memory.

  ![](/images/blog/linux-mm/03.webp)

- `Type flags` specify the required action and zone modifiers to fulfill a particular type of transaction.

  <details>
  <summary>Type Flags</summary>

  ![](/images/blog/linux-mm/04.webp)

  ![](/images/blog/linux-mm/05.webp)

  </details>

---

<b><mark>Which Flag to Use When</mark></b>

![](/images/blog/linux-mm/06.webp)

### `kfree`

<aside class="callout">

The `kfree()` method frees a block of memory previously allocated with `kmalloc()`. Declared in `<linux/slab.h>`.

</aside>

```c
void kfree(const void *ptr)
```

![](/images/blog/linux-mm/07.webp)

![](/images/blog/linux-mm/08.webp)

## `vmalloc`

<aside class="callout">

The `vmalloc()` function works in a similar fashion to `kmalloc()`, except it allocates memory that is only <b><u>virtually contiguous and not necessarily physically contiguous</u></b>.This is how a user-space allocation function works.

> It does this by allocating potentially noncontiguous chunks of physical memory and “fixing up” the page tables to map the memory into a contiguous chunk of the logical address space.

</aside>

```c
// declared in <linux/vmalloc.h>
// defined in mm/vmalloc.c
void * vmalloc(unsigned long size)
void vfree(const void *addr)
```

Despite the fact that physically contiguous memory is required in only certain cases, most kernel code uses `kmalloc()` and not `vmalloc()` to obtain memory. Primarily, this is for <b><u>performance</u></b>.

- <mark>Performance issue</mark>: `vmalloc()` function, to make nonphysically contiguous pages contiguous in the virtual address space, <u>must specifically set up the page table entries</u>.
- Thus, `vmalloc()` is used only when absolutely necessary—typically, to <u>obtain large regions of memory</u>. For example, when <u>modules</u> are dynamically inserted into the kernel, they are loaded into memory created via `vmalloc()`.

## Slab Layer

### Motivation & Definition

<blockquote>

One background and one issue about kernel memory allocation.

</blockquote>

<aside class="callout">

<mark><u>Allocating and freeing data structures</u></mark><mark> is a common operation in kernels</mark>. Programmers use **`free lists`** to make this process more efficient. <br /><br />A **free list** contains available, already allocated data structures. When code requires a new instance of a data structure, it can grab one from the free list instead of allocating memory and setting it up. When the data structure is no longer needed, it is returned to the free list instead of deallocated. The free list acts as an <b><mark>object cache</mark></b> for a frequently used type of object.

</aside>

<aside class="callout">

The main **issue with free lists** in the <mark><u>kernel is the lack of global control</u></mark><mark>. When memory is low, the kernel cannot instruct every free list to reduce the size of its cache</mark> in order to free memory.

</aside>

To remedy this, the Linux kernel provides the <b><u>slab layer</u></b> (also called the <b><u>slab allocator</u></b>).The slab layer acts as a <b><mark>generic data structure → caching layer</mark></b>.

> Generic data structure is a structure that can be used to store any type of data.

The <mark>slab layer divides different objects into groups called </mark><mark><u>caches</u></mark>, each of which stores a different type of object. There is **one cache per object type**.

> For example, one cache is for process descriptors (a free list of task\_struct structures), another cache is for inode objects (struct inode).

 The <mark>caches are then divided into </mark><i><b><mark>slabs</mark></b></i>. The slabs are composed of one or more <u>physically</u> contiguous pages. Typically, slabs are composed of only a single page. Each cache may consist of multiple slabs.

![](/images/blog/linux-mm/09.webp)

The <mark>slab layer works by</mark> first allocating a big block of memory, called a slab, from the page allocator. The slab is then divided into smaller objects of the same size, which are linked together. When an object is needed, the slab layer searches the linked list for an available one. If it finds one, it's returned. If no available objects are found, the slab layer creates a new object and adds it to the linked list. When an object is no longer needed, it's returned to the slab layer, which marks it as free and adds it to the end of the linked list.

### Tenets of Design

- <b><mark>Cache frequently used structures</mark></b> → Frequently used data structures tend to be allocated and freed often, so **cache** them.
- <b><mark>Prevent memory fragmentation</mark></b> → Frequent allocation and deallocation can result in memory fragmentation (the inability to find large contiguous chunks of available memory). To prevent this, the cached free lists are arranged contiguously. Because freed data structures return to the free list, there is no resulting fragmentation.
- <b><mark>Performance</mark></b> → The free list provides improved performance during frequent allocation and deallocation because a freed object can be immediately returned to the next allocation.

### Slab Layer Structure

<aside class="callout">

**Recap**: The slab layer divides different objects into groups called ***caches***, each of which stores a different type of object. <mark>There is </mark><b><mark><u>one cache per object type</u></mark></b><mark>. The caches are then divided into </mark><i><mark>slabs</mark></i><mark>. The slabs are composed of one or more physically contiguous pages. Then each slab contains some number of </mark><i><mark>objects</mark></i><mark>, which are the data structures being cached.</mark>

<blockquote>

For example, one cache is for process descriptors (a free list of task\_struct structures), whereas another cache is for inode objects (struct inode).

![](/images/blog/linux-mm/10.webp)

</blockquote>

</aside>

**Each slab is in one of three states**: **`full, partial, or empty`**.

<ul>

<li>

A full slab has no free objects. (All objects in the slab are allocated)

</li>

<li>

An empty slab has no allocated objects (All objects in the slab are free)

</li>

<li>

A partial slab has some allocated objects and some free objects

</li>

</ul>

---

Each <b><mark><u>cache</u></mark></b> is represented by a `kmem_cache` structure.This structure contains <u>three lists</u>—`slabs_full`, `slabs_partial`, and `slabs_empty`—stored inside a `kmem_list3` structure, which is defined in `mm/slab.c`.

A <b><u>slab</u></b> descriptor,struct slab, represents each slab is:

![](/images/blog/linux-mm/11.webp)

![](/images/blog/linux-mm/12.webp)

---

The slab allocator <b>creates new </b><b><mark>slabs</mark></b> by interfacing with the low-level kernel page allocator via `__get_free_pages()`.

<blockquote>

For educational purposes, we can ignore the NUMA-aware code and write a simple `kmem_getpages()`:

![](/images/blog/linux-mm/13.webp)

<aside class="callout">

In the Linux kernel, `gfporder` is an unsigned integer that represents the base 2 logarithm of the number of pages to allocate for each slab.

</aside>

</blockquote>

Memory is then freed by `kmem_freepages()`, which calls `free_pages()` on the given cache’s pages. The freeing function is called only when available memory grows low and the system is attempting to free memory, or when a cache is explicitly destroyed.

### Slab Layer Interface

<aside class="callout">

The slab layer is managed on a <b><u>per-cache basis</u></b> through a simple interface, which is <u>exported to the entire kernel</u>.The interface enables the creation and destruction of new caches and the allocation and freeing of objects within the caches.

</aside>

<blockquote>

**cache create** function

![](/images/blog/linux-mm/14.webp)

![](/images/blog/linux-mm/15.webp)

</blockquote>

- First parameter is a string storing the name of the cache.
- Second parameter is the size of each element in the cache.
- Third parameter is the offset of the first object within a slab. This is done to ensure a particular alignment within the page. Normally, zero is sufficient, which results in the standard alignment.
- Flags parameter specifies optional settings controlling the cache’s behavior.
  - It can be zero, specifying no special behavior, or one or more of the following flags OR’ed together:
    - `SLAB_HWCACHE_ALIGN`: Aligns each object within a slab to a cache line. This prevents “false sharing” (two or more objects mapping to the same cache line despite existing at different addresses in memory). This improves performance but comes at a cost of increased memory footprint.
    - `SLAB_POISON`: Causes the slab layer to fill the slab with a known value (a5a5a5a5). This is called poisoning and is useful for catching access to uninitialized memory.
    - `SLAB_RED_ZONE`: Causes the slab layer to insert “red zones” around the allocated memory to help detect buffer overruns.
    - `SLAB_PANIC`: Causes the slab layer to panic if the allocation fails.
    - `SLAB_CACHE_DMA`: Instructs the slab layer to allocate each slab in DMA-able memory.
- Final parameter, `ctor`, is a constructor for the cache.The constructor is called whenever new pages are added to the cache.\$

---

After a cache is created, an **object is obtained from the cache via**:

```c
void * kmem_cache_alloc(struct kmem_cache *cachep, gfp_t flags)
```

This function **returns a pointer to an object** from the given cache cachep. If no free objects are in any slabs in the cache, and the slab layer must obtain new pages via `kmem_getpages()`, the <u>value of flags is passed to</u> `__get_free_pages()`.

```c
void kmem_cache_free(struct kmem_cache *cachep, void *objp)
```

## Allocation on the Stack

<aside class="callout">

The kernel's stack is small and fixed. By giving each process a small, fixed stack, memory consumption is minimized, and the kernel need not burden itself with stack management code.

</aside>

### Single-Page Kernel Stacks<br />

<aside class="callout">

Historically, the kernel stack has been two pages per process. In the 2.6 kernel series, however, an option was introduced to move to **single-page kernel stacks**.

</aside>

- Reason\_1: It results in a page with <b><mark>less memory consumption per process</mark></b>
- Reason\_2: As uptime increases, it becomes <b><mark>increasingly hard to find two physically contiguous unallocated pages</mark></b>

Historically, <u>interrupt handlers</u> shared the stack of the interrupted process.When single page stacks are enabled, interrupt handlers are given their own stacks. In any case, unbounded recursion is obviously not allowed.

### Stack Overflows

Stack overflows can occur silently and result in various issues. The kernel does not attempt to manage the stack, so when a stack overflow happens, the excess data spills over to whatever exists at the end of the stack.

<ul>

<li>

First thing to eat it is the `thread_info` structure, which is allocated at the end of each process’s kernel stack.

</li>

<li>

Beyond the stack, any kernel data might lurk and leads to data curruption.

</li>

</ul>

## High Memory Mappings

### Memory Mapping Intro

<aside class="callout">

High memory (highmem) is used when the size of physical memory approaches or exceeds the maximum size of virtual memory. At that point it becomes impossible for the kernel to keep all of the available physical memory mapped at all times.

</aside>

> A 32-bit architecture can only address 4 GB of memory, but not all of it is available for use by the system. The address space is divided between user space and kernel space. Typically, the lower 3 GB is used for user space, while the upper 1 GB is reserved for the kernel. This means the kernel can only directly address 1 GB of physical memory.

> When a system has more than this amount of physical memory, the additional memory is referred to as "high memory." This memory is not directly mapped into the kernel's address space, and the kernel cannot directly access it.

To use high memory, the kernel uses a technique called high memory mappings. It sets up special mappings that allow it to temporarily view a portion of the high memory in its address space. When it needs to access some data in the high memory, it creates a mapping, accesses the data, and then removes the mapping.

This process is more complex and has more overhead than accessing directly mapped memory, so it can reduce performance. But it allows systems with a 32-bit architecture to use more than 1 GB of physical memory.

In 64-bit systems, this isn't generally a problem because the address space is vastly larger (2\^64 bytes), so all of the physical memory can be directly mapped into the kernel's address space.

### High Memory Mapping x86

<aside class="callout">

Physical memory that is not permanently mapped to the kernel's address space is referred to as high memory. Pages obtained via `alloc_pages()` with the `__GFP_HIGHMEM` flag might not have a logical address.

</aside>

On an x86 architecture, any physical memory beyond 896 MB is considered high memory. Even though x86 processors can physically address up to 4GB (or up to 64GB with Physical Address Extension (PAE)), these <mark>pages need to be explicitly mapped into the kernel's logical address space after allocation</mark>. On x86, pages in high memory are mapped somewhere between the 3GB and 4GB mark.

#### Permanent Mappings

<aside class="callout">

A permanent mapping  is a type of mapping used to provide a continuous and fixed association between a page in the high memory area and a logical address in the kernel address space.

</aside>

Permanent mapping a given page into the kernel's address space use function: <b>`void`</b>` `<b>`kmap(struct page *page)`</b>. This function is capable of working with both high and low memory. If the page is in low memory, the page's virtual address is simply returned. However, if the page is in high memory, a permanent mapping is created and the address is returned. The **`void kunmap(struct page *page)`** function is then used to unmap the high memory when it is no longer needed.

#### Temporary Mappings

<aside class="callout">

Temporary mapping, or atomic mapping, is a Linux kernel technique to temporarily map a high memory page into the kernel's address space. This is done when an operation needs to be performed on the data in the page, but cannot wait for a permanent mapping to be set up.

</aside>

Sometimes a context cannot sleep and needs a mapping to be created. In such cases, temporary (or atomic) mappings are used. These are a set of reserved mappings that can hold a temporary mapping. They can be set up using **`kmap_atomic(struct page *page, enum km_type type)`**, and are useful in contexts that cannot be blocked, like **interrupt handlers**. The purpose of the temporary mapping is defined by the **`km_type`** enumeration. The temporary mapping is undone using **`kunmap_atomic(void *kvaddr, enum km_type type)`**.

## Per-CPU Allocation

<aside class="callout">

Modern SMP-capable operating systems use per-CPU data—**data that is unique to a given processor**. Typically, <b><mark>per-CPU data is stored in an array</mark></b>. Each item in the array corresponds to a possible processor on the system.The current <b><mark>processor number indexes this array</mark></b>.

</aside>

Note that<b> </b><b><u>no lock is required</u></b> because this data is unique to the current processor.

![](/images/blog/linux-mm/16.webp)

![](/images/blog/linux-mm/17.webp)

---

<b><mark>Kernel Preemption Issue</mark></b>

<aside class="callout">

Kernel preemption refers to the ability of the operating system kernel to interrupt or preempt the currently executing task in favor of a higher priority task.

</aside>

- If your code is preempted and reschedules on another processor, the cpu variable becomes invalid since it points to the wrong processor.
- If another task preempts your code, it can access my\_percpu on the same processor concurrently, creating a race condition.

<mark>We do not need to worry about this issue</mark>, because the call `get_cpu()` **disables kernel preemption**.The corresponding call to `put_cpu()` **enables kernel preemption**.

### Reasons for Using Per-CPU Data<br />

1. <b><u>Reduction in locking</u></b> requirements
   > Note that the only safety requirement for the use of per-CPU data is <u>disabling kernel preemption</u>, which is much cheaper than locking, and the interface does so automatically.
2. per-CPU data greatly <b><u>reduces cache invalidation</u></b>
   > If one processor manipulates data held in another processor's cache, that processor must flush or otherwise update its cache. <u>Constant cache invalidation is called </u><i><u>thrashing</u></i><u> the cache and wreaks havoc on system performance</u>. The use of per-CPU data keeps cache effects to a minimum because processors ideally access only their own data.

## Summary: Allocate Memory in Kernel

- Use low-level page allocators like `kmalloc()` for <b><u>contiguous physical pages</u></b>. Use the `GFP_ATOMIC` flag for high-priority allocation that **won't sleep**, required for interrupt handlers and non-sleeping code. Use `GFP_KERNEL` for process context code that can sleep but doesn't hold a spin lock.
- For **high-memory allocation**, use `alloc_pages()`. This returns a struct page, not a pointer to a logical address. Use `kmap()` to map <b><u>high memory into the kernel's logical address</u></b> space to obtain an actual pointer.
- Use `vmalloc()` for **virtually contiguous memory**. Note that `vmalloc()` has a slight performance hit compared to `kmalloc()`. This function allocates kernel memory that is virtually contiguous but not physically contiguous.
- For creating and destroying many large data structures, set up a <b><u>slab cache</u></b>. This maintains a per-processor object cache, which can greatly enhance object allocation and deallocation performance.
