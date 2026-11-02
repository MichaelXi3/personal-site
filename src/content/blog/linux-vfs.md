---
title: Linux Virtual Filesystem
description: ""
date: 2023-06-08
tags:
  - Operating System
  - Linux
---

## Virtual Filesystem Intro

<aside class="callout">

The Virtual File System (VFS) is an **abstraction layer in the kernel** of an operating system that allows it to interact with different types of file systems in a uniform way.

> The VFS acts as an interface between the system kernel and the various file systems, enabling the kernel to treat different file systems—whether they are network file systems, disk-based file systems, or pseudo file systems—in the same manner.

</aside>

<b><mark>VFS Design</mark></b>: VFS is designed to be **flexible** and **modular**, allowing new file systems to be added easily. As new storage and network technologies are developed, VFS ensures that the operating system can interact with them. Through a **common API**, VFS provides consistent system calls for file operations such as open, read, write, and close, no matter the file system type.

<mark>VFS enables the "</mark><b><mark>everything is a file</mark></b><mark>" abstraction in Unix-like systems</mark>.

![](/images/blog/linux-vfs/01.webp)

### Filesystem Interface

> The VFS is the glue that enables system calls such as `open()`, `read()`, and `write()` to work regardless of the filesystem or underlying physical medium. Such a generic interface is feasible only because the kernel implements an <mark>(Filesystem) </mark><b><mark>abstraction layer</mark></b><b> around its low-level filesystem interface</b>.

**Example**: `ret = write (fd, buf, len);`

On one side of the system call is the generic VFS interface, providing the frontend to user-space; on the other side of the system call is the filesystem-specific backend, dealing with the implementation details.

![](/images/blog/linux-vfs/02.webp)

### Unix Filesystems Concepts

<aside class="callout">

Unix has provided four basic filesystem-related **abstractions**: `files`, `directory entries`, `inodes`, and `mount points`.

</aside>

<aside class="callout">

A ***file system*** is a <b><mark>hierarchical storage of data adhering to a specific structure</mark></b>. File systems contain files, directories, and associated control information. Typical operations performed on file systems are creation, deletion, and mounting.

</aside>

<aside class="callout">

A ***file*** is an <b><mark>ordered string of bytes</mark></b>. The first byte marks the beginning of the file, and the last byte marks the end of the file. Each file is assigned a human-readable name for identification by both the system and the user. Typical file operations include reading, writing, creating, and deleting.

</aside>

<aside class="callout">

A ***namespace*** is a container that holds **identifiers**. It is a way to implement scope. In Unix, each mount point gets added to the namespace and each mounted filesystem appears as part of a single unified directory tree.

</aside>

<aside class="callout">

The ***global hierarchy*** is the file structure of the Unix system. Unix systems organize files in a hierarchical filesystem. The top of this hierarchy is known as the root directory, represented as `/`. This hierarchical structure is sometimes also called the directory tree.

</aside>

<aside class="callout">

A ***mount point*** is a directory in the filesystem where additional information is mounted. When a filesystem is mounted on a mount point, the contents of the filesystem appear in that directory.

</aside>

> In Unix, filesystems are mounted at a specific <b><u>mount point</u></b> in a <b><u>global hierarchy</u></b> known as a `namespace`. This enables all mounted filesystems to appear as entries in a single tree. Different filesystems (which could even be on different devices or remote locations) are attached to specific directories in the Unix file hierarchy.

<aside class="callout">

Files are organized in directories. A ***directory*** is analogous to a folder and usually contains related files. Directories can also contain other directories, called ***subdirectories***. In this way, directories may be nested to form ***paths***. <mark>Each component of a path is called a </mark><i><b><mark>directory entry</mark></b></i>.

> A **path** example is `/home/wolfman/butter`—the root directory `/`, the directories `home` and `wolfman`, and the file `butter` are all directory entries, called <i><b><mark>dentries</mark></b></i>.

</aside>

<aside class="callout">

In Unix, <i><b><mark>directories</mark></b></i><b><mark> are actually normal files that simply list the files contained therein</mark></b>.

</aside>

<aside class="callout">

<mark>Unix systems separate the concept of a file from any associated information</mark> about it, such as access permissions, size, owner, creation time, and so on. This information is sometimes called ***file metadata*** (that is, data about the file's data) and is stored in a separate data structure from the file, called the <i><b><mark>inode</mark></b></i> (index node).

</aside>

<aside class="callout">

All information is tied together with the file system's own control information, which is stored in the <i><b><mark>superblock</mark></b></i>. The <mark>superblock is a data structure containing information about the file system as a whole</mark>.

</aside>

## VFS Objects and Data Structures

<aside class="callout">

The VFS is <b><u>object-oriented</u></b>. The structures contain both data and pointers to filesystem-implemented functions that operate on the data.

> Note that <i>objects </i>refer to **structures**—not explicit class types

</aside>

<mark>The four </mark><i><b><mark>primary</mark></b></i><b><mark> object</mark></b><mark> types of theVFS are:</mark>

- The <i><b>`superblock`</b></i> object, which represents a specific mounted filesystem.
- The <i><b>`inode`</b></i> object, which represents a specific file.
- The <i><b>`dentry`</b></i> object, which represents a directory entry, which is a single component of a path.
- The <i><b>`file`</b></i> object, which represents an open file associated with a process.

<i><b><mark>operations</mark></b></i><i><mark> </mark></i><b><mark>object</mark></b><mark> is contained within each of these primary objects.These objects describe the methods that the kernel invokes against the primary objects.</mark>

> The operations objects are implemented as a <u>structure of pointers to functions</u> that operate on the parent object.

- The <i><b>`super_operations`</b></i> object contains methods that the kernel can invoke on a specific **filesystem**, such as `write_inode()` and `sync_fs()`.
- The <i><b>`inode_operations`</b></i> object contains methods that the kernel can invoke on a specific **file**, such as `create()` and `link()`.
- The <i><b>`dentry_operations`</b></i> object contains methods that the kernel can invoke on a specific **directory entry**, such as `d_compare()` and `d_delete()`.
- The <i><b>`file_operations`</b></i> object contains methods that a process can invoke on an **open file**, such as `read()` and `write()`.

<mark>VFS loves </mark><b><mark>structures</mark></b>. It has more than the primary objects mentioned before. Each <u>registered filesystem is represented by</u> `file_system_type` structure, describing the filesystem and its capabilities. Each <u>mount point is represented by</u> `vfsmount` structure, containing information such as location and mount flags.

### The Superblock Object<br />

<aside class="callout">

The superblock object is implemented by each filesystem and is used to <mark>store information describing that specific filesystem</mark>. This object usually corresponds to the ***filesystem superblock*** or the ***filesystem control block***, which is stored in a special sector on disk.

</aside>

<blockquote>

`struct super_block` defined in `<linux/fs.h>`

![](/images/blog/linux-vfs/03.webp)

![](/images/blog/linux-vfs/04.webp)

</blockquote>

#### Superblock Operation

<aside class="callout">

The most important item in the superblock object is `s_op`, which is a **pointer to the superblock operations table**. Each item in this structure is a <u>pointer to a function</u> that operates on a superblock object.

![](/images/blog/linux-vfs/05.webp)

![](/images/blog/linux-vfs/06.webp)

</aside>

Due to the <mark>lack of object-oriented support in C, there is no way for the method to easily obtain its parent</mark>, so you have to pass it. An example of a same code between C and C++:

```c
sb->s_op->write_super(sb); // C
sb.write_super();          // C++
```

### The Inode Object

<aside class="callout">

The inode object represents all the information needed by the kernel to manipulate a file or directory.

</aside>

<blockquote>

`struct inode` and is defined in `<linux/fs.h>`

![](/images/blog/linux-vfs/07.webp)

![](/images/blog/linux-vfs/08.webp)

</blockquote>

#### Inode Operation

<aside class="callout">

**inode\_operations** describes the filesystem’s implemented functions that theVFS can invoke on an inode.

<blockquote>

An invoke example is: `i->i_op->truncate(i)`

- `i` is a reference to a particular inode

</blockquote>

</aside>

<blockquote>

`inode_operations` defined in `<linux/fs.h>`

![](/images/blog/linux-vfs/09.webp)

![](/images/blog/linux-vfs/10.webp)

</blockquote>

### The Dentry Object

> **Context**: <u>VFS treats directories as a type of file</u>. In the path `/bin/vi`, both `bin` and `vi` are files - `bin` being the special directory file and `vi` being a regular file. Despite this useful unification, <u>VFS often needs to perform directory-specific operations, such as path name lookup</u>. Path name lookup involves translating each component of a path, ensuring it is valid, and following it to the next component.

<aside class="callout">

To facilitate this, the VFS employs the concept of a directory entry (dentry). A <i><b><mark>dentry</mark></b></i><mark> is a specific component in a path</mark>.

> Using the previous example, `/`, `bin`, and `vi` are all <u>dentry objects</u>. The first two are directories, and the last is a regular file. This is an important point: <mark>Dentry objects are </mark><i><mark>all</mark></i><mark> components in a path, including files</mark>. Resolving a path and walking its components is a nontrivial exercise, dentry object makes the whole process easier.

</aside>

<blockquote>

`struct dentry` defined in `<linux/dcache.h>`

![](/images/blog/linux-vfs/11.webp)

</blockquote>

- Unlike the previous two objects, the <mark>dentry object does not correspond to any sort of on-disk data structure</mark>. Dentry object is not physically stored on the disk.
- TheVFS creates it on-the-fly from a string representation of a path name.

#### Dentry State

<aside class="callout">

A **dentry** object can be in one of three states: `used`, `unused`, or `negative`

</aside>

<ol>

<li>

`used`: A used dentry corresponds to a **valid inode** (`d_inode` points to an associated inode) and indicates that there are one or more users of the object (`d_count` is **positive**). A used dentry is in use by the VFS and points to valid data, and thus <u>cannot be discarded</u>.

</li>

<li>

`unused`: An unused dentry refers to a **valid inode**(`d_inode` pointing to an inode), but the VFS is not currently using the dentry object (`d_count` is **zero**). Dentry object is kept around as a **cache** in case it is needed again.

> By caching the dentry instead of destroying it early, the dentry won't need re-creation if it's needed in the future. This speeds up path name lookups. If memory needs to be reclaimed, the dentry can be discarded because it's not in use.

</li>

<li>

`negative`: **not** associated with a **valid inode** (`d_inode` is NULL) because either the inode was deleted or the path name was never correct to begin with. The dentry is **kept around**, however, so that future lookups are resolved quickly.

> Consider a daemon that tries to read a missing config file, causing costly failed lookups. Caching these negative results can be worthwhile.

</li>

</ol>

#### Dentry Cache

<aside class="callout">

After the VFS layer resolves each path element into a dentry object, it will caches it in the dentry cache (**dcache**) to avoid wasting effort.

</aside>

The dentry cache consists of **three parts**:

1. Lists of “**used**” dentries linked off their associated inode via the i\_dentry field of the inode object.
2. A doubly linked “**least recently used**” list of unused and negative dentry objects.
   > The list is inserted at the head, such that entries toward the head of the list are newer than entries toward the tail. When the kernel must remove entries to reclaim memory, the entries are removed from tail; those are the oldest and presumably have the least chance of being used in the near future.
3. A hash table and hashing function used to quickly resolve a given path into the associated dentry object.
   > Hash table is represented by the dentry\_hashtable array. Each element is a pointer to a list of dentries that hash to the same value.

---

<b><mark>Example</mark></b>: Assume that you are editing a source file in your home directory, `/home/dracula/src/the_sun_sucks.c`. Each time this file is accessed (for example, when you first open it), the VFS must follow each directory entry to resolve the full path:`/`,`home`,`dracula`,`src`,and finally `the_sun_sucks.c`.To avoid this time-consuming operation each time this path name is accessed, the VFS can first try to look up the path name in the dentry cache. If the lookup succeeds, the required final dentry object is obtained without serious effort. Conversely, the VFS must manually resolve the path by walking the filesystem for each component of the path. After this task is completed,the kernel adds the dentry objects to the dcache to speed up any future lookups.

#### Dentry Operation

<blockquote>

`dentry_operations` structure is defined in `<linux/dcache.h>`

![](/images/blog/linux-vfs/12.webp)

</blockquote>

### The File Object<br />

<aside class="callout">

The file object is used to represent a **file opened by a process**. <mark>The object points back to the dentry (which in turn points back to the inode) that actually represents the open file</mark>. Note that the file object does not actually correspond to any on-disk data like dentry object.

</aside>

> The file object is the <b><mark>in-memory representation of an open file</mark></b>.The object (but not the physical file) is created in response to the `open()` system call and destroyed in response to the `close()` system call. Because multiple processes can open and manipulate a file at the same time, <b><mark>there can be multiple file objects in existence for the same file</mark></b>.

<blockquote>

`struct file` and is defined in `<linux/fs.h>`

![](/images/blog/linux-vfs/13.webp)

![](/images/blog/linux-vfs/14.webp)

</blockquote>

#### File Operations

![](/images/blog/linux-vfs/15.webp)

![](/images/blog/linux-vfs/16.webp)

<b><mark>Some Important Operations</mark></b>:

![](/images/blog/linux-vfs/17.webp)

![](/images/blog/linux-vfs/18.webp)

![](/images/blog/linux-vfs/19.webp)

![](/images/blog/linux-vfs/20.webp)

![](/images/blog/linux-vfs/21.webp)

## Data Structures Associated with Filesystems<br />

<aside class="callout">

In addition to fundamental VFS objects, the kernel also uses standard data structures to manage filesystem data. One structure <u>describes a specific variant of a filesystem</u> (e.g. ext3, ext4, UDF), while <u>the other describes a mounted instance of a filesystem</u>.

</aside>

### file\_system\_type

<aside class="callout">

Linux supports many different filesystems, so the kernel requires a special structure to **describe the capabilities and behavior of each filesystem**.

</aside>

<blockquote>

`file_system_type` is defined in` <linux/fs.h>`

![](/images/blog/linux-vfs/22.webp)

</blockquote>

- `get_sb()` function reads the superblock from the disk and <u>populates the superblock object when the filesystem is loaded</u>.

### vfsmount

<aside class="callout">

Things get more interesting <u>when the file system is actually mounted</u>. At this point, the `vfsmount` structure is created. This structure **represents a specific instance of a file system**, in other words, a **mount point**.

</aside>

<blockquote>

`vfsmount` structure is defined in `<linux/mount.h>`

![](/images/blog/linux-vfs/23.webp)

![](/images/blog/linux-vfs/24.webp)

</blockquote>

- It’s **complicated** to maintain the <u>relation between the filesystem and all the other mount points</u>. The various **linked lists** in `vfsmount` keep track of this information.
- `mnt_flags` specifies the standard mount flags

  <blockquote>

  These flags are useful on removable devices that the admin does not trust.

  ![](/images/blog/linux-vfs/25.webp)

  </blockquote>

## Data Structures Associated with a Process<br />

<aside class="callout">

Each <u>process on the system maintains its own list</u> of open files, root filesystem, current working directory, and mount points. Three data structures connect the VFS layer and the processes on the system: `files_struct`, `fs_struct`, and `namespace`.

</aside>

1. <b><mark>files\_struct</mark></b><b> </b>is used by the Linux kernel to keep track of <u>all of the open files for a process</u>.

   ![](/images/blog/linux-vfs/26.webp)

   - The array `fd_array` points to the list of open file objects. `NR_OPEN_DEFAULT` is 64, but you can adjust this macro as needed.
2. <b><mark>fs\_struct</mark></b> contains <u>filesystem information related to a process</u> and is pointed at by the fs field in the process descriptor.

   ![](/images/blog/linux-vfs/27.webp)

3. <b><mark>namespace</mark></b> enable each process to have a <u>unique view of the mounted filesystems</u> on the system—not just a unique root directory, but an entirely <u>unique filesystem hierarchy</u>.

   ![](/images/blog/linux-vfs/28.webp)

   ![](/images/blog/linux-vfs/29.webp)

   - The `list` member specifies a doubly linked list of the mounted filesystems that make up the namespace.

<aside class="callout">

These <mark><u>data structures are linked from each </u></mark><b><mark><u>process descriptor</u></mark></b>. For most processes, the process descriptor points to unique `files_struct` and `fs_struct` structures, except for the processes created with the **clone** flag `CLONE_FILES` or `CLONE_FS`.

</aside>

<aside class="callout">

The `namespace` structure works in reverse. By default, <u>all processes share the same namespace</u>, which means that they all see the same filesystem hierarchy from the same mount table. The process is only given a unique copy of the namespace structure when the `CLONE_NEWNS` flag is specified during `clone()`. However, most processes do ***not*** provide this flag, which means that all processes inherit their parent's namespaces. Therefore, on many systems, there is only one namespace, although the functionality is only one `CLONE_NEWNS` flag away.

</aside>

## Conclusion

Linux supports a wide range of file systems, from native file systems such as ext3 and ext4, to networked file systems such as NFS and Coda. There are more than 60 file systems alone in the official kernel.

The VFS layer provides these disparate file systems with both a framework for their implementation and an interface for working with the standard system calls. The VFS layer makes it easy to implement new file systems in Linux and enables those file systems to automatically interoperate via the standard Unix system calls.

<aside class="callout">

The operations associated with `struct file` are the familiar system calls that form the **basis of the standard Unix system calls**.

</aside>
