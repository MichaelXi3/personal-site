---
title: Buffer Overflow
description: ""
date: 2023-04-12
tags:
  - Operating System
  - Security
---

## Introduction

<aside class="callout">

**Buffer overflow** condition exists when a program attempts to put more data in a buffer than it can hold. <mark>Writing outside the bounds of a block of allocated memory can corrupt data, crash the program, or cause the execution of malicious code.</mark>

</aside>

### Process Memory Organization

<blockquote>

There’re three regions: program, heap, stack

![](/images/blog/unix-buffer-overflow/01.webp)

- `Process memory` refers to the memory space that is allocated to a specific process or program when it is executed on a computer. It includes all the data, instructions, and variables that are needed by the process to function properly.
- `Heap segment`: This is the memory region that is <u>dynamically allocated</u> during program execution to store data structures like arrays and linked lists. It grows in size as the program requests more memory and can be resized as needed.
- `Stack segment`: This region is used to store the program's runtime stack, which is used to keep track of <u>function calls and local variables</u>. It typically grows downward in memory as more data is pushed onto the stack.
- `.bss`: Contains uninitialized global and static variables. Memory is allocated by the OS at program startup and initialized to zero.
- `.text`: Contains executable code of the program, such as arithmetic, logic, and data manipulation instructions. This section is typically read-only and not modified during execution.
- `.data` : Contains initialized global and static variables allocated by the OS at program startup. Unlike ".bss", the ".data" section contains initialized data, meaning it's initialized to a predefined value before execution.

</blockquote>

### Stack and Function Calls

- Stack is a continuous block of memory
  - Stack Pointer (`rsp`) points to the top of stack
  - The **bottom** of the stack is a fixed high memory, `0xffffffff`

    ![](/images/blog/unix-buffer-overflow/02.webp)

- When function is called the stack contains
  - Function argument and local variables
  - Data required to recovery from the function call, which includes the <b><u>return address of the calling statement</u></b>

    <details>
    <summary>Example Stack Contents</summary>

    ![](/images/blog/unix-buffer-overflow/03.webp)

    ![](/images/blog/unix-buffer-overflow/04.webp)

    </details>

## Buffer Overflow Implementations

### A Simple Buffer Overflow

![](/images/blog/unix-buffer-overflow/05.webp)

- `strcopy()` copies the contents of str into buffer, until a ‘\\0’ is encountered in the string.
- Since the size of memory pointed by str is larger than buffer, strcpy continues copying, overwriting `rbp` and `ret`.
- As a result, the **return address** `ret` becomes `0x41414141`

<details>
<summary>Segmentation Fault Case</summary>

![](/images/blog/unix-buffer-overflow/06.webp)

</details>

### A Friendly Buffer Overflow

<div class="columns">

<div style="flex: 75">

![](/images/blog/unix-buffer-overflow/07.webp)

</div>

<div style="flex: 25">

![](/images/blog/unix-buffer-overflow/08.webp)

</div>

</div>

- First, we need to calculate the address of `ret`. `ret` is 4 bytes after the end of buffer 1, so address of `ret` is `buffer1 + 12`.
- What will happen? `ret` now points to the next instruction than it should be. So `x = 1` is skipped.

  ![](/images/blog/unix-buffer-overflow/09.webp)

### A Less Friendly Buffer Overflow

<div class="columns">

<div style="flex: 81.25">

![](/images/blog/unix-buffer-overflow/10.webp)

</div>

<div style="flex: 18.75">

![](/images/blog/unix-buffer-overflow/11.webp)

</div>

</div>

- A less friendly Buffer Overflow will modify the return address to a shellcode address, so that shell code will be executed.
- **Shell Code**
  - Since the instructions are on the stack, they must be in assembler
  - To get shell code, you can write in C and compile. For instance:

    <blockquote>

    Compile with `gcc -static -g` and view using `gdb` or `objdump`

    ![](/images/blog/unix-buffer-overflow/12.webp)

    ![](/images/blog/unix-buffer-overflow/13.webp)

    </blockquote>

  - Or you can go to website: [exploit-db](https://www.exploit-db.com/shellcodes)
- **Another Example**

  ![](/images/blog/unix-buffer-overflow/14.webp)

  ![](/images/blog/unix-buffer-overflow/15.webp)

### A More Realistic Buffer Overflow

- Realistically, program <u>reads from an external source</u> then copies to a buffer.
- The buffer overflow program is more difficult to write since <mark>we don’t know exactly where the buffer to overflow is, and cannot use an address of local variable to determin ret</mark> since we don’t know the source code.
  - So we have to make a guess and provide an **offset**

<blockquote>

<b>Example👇 More Catch the Flag:  </b>[**http://pwnable.kr/play.php**](http://pwnable.kr/play.php)

![](/images/blog/unix-buffer-overflow/16.webp)

![](/images/blog/unix-buffer-overflow/17.webp)

![](/images/blog/unix-buffer-overflow/18.webp)

</blockquote>

## Buffer Overflow Types

The examples above are all instances of C-String Buffer Overflow, but there are other types as well.

### C-String Overflow

- Overflow Layout

  ![](/images/blog/unix-buffer-overflow/19.webp)

- Real World Example

  ![](/images/blog/unix-buffer-overflow/20.webp)

### Integer Overflow

- What is it?

  ![](/images/blog/unix-buffer-overflow/21.webp)

- **OpenSSH** Example

  ![](/images/blog/unix-buffer-overflow/22.webp)

### Format String Overflow

A format string overflow is a type of vulnerability that occurs when an attacker is able to provide input to a program that is later used as a format string argument in a call to a formatting function like "`printf`" or "`sprintf`" without proper input validation or bounds checking.

The issue arises when the attacker can supply a format string containing format specifiers like `%s`, `%x`, `%n`, etc. that the formatting function interprets as instructions to read from or write to memory locations outside the intended buffer or stack frame, leading to memory corruption and potentially allowing the attacker to execute arbitrary code or modify program data.

<blockquote>

**Example**

```c
printf(user_input);
```

If the "user\_input" variable contains a format string like "`%x%x%x`", the "`printf`" <u>function will interpret it as an instruction to print the next three values on the stack as hexadecimal values</u>. If the attacker can control the values on the stack, they can use this vulnerability to leak sensitive information or modify the program's behavior.

![](/images/blog/unix-buffer-overflow/23.webp)

![](/images/blog/unix-buffer-overflow/24.webp)

</blockquote>

To **prevent** format string vulnerabilities, <u>input validation</u> and <u>bounds checking</u> are necessary. Programmers should <mark>sanitize and validate any user-supplied input</mark> passed as format string arguments before using it in a formatting function. This can be done by limiting the number of format specifiers allowed, avoiding the use of user input as format strings, or using safer formatting functions such as "`snprintf`" that limit the amount of output produced.

### Return to libc Overflow

![](/images/blog/unix-buffer-overflow/25.webp)

![](/images/blog/unix-buffer-overflow/26.webp)

---

<ul>

<li>

Instead of putting large shell code in the buffer, the Overflow redirects the `ret` to `system()` function with parameter.

- For instance, instead of putting the long `ls` shell code inside buffer, we can redirect to `system()` function with parameter `ls`.

</li>

<li>

This type of overflow also <b><u>made stack non-executable offer no protection</u></b>, because <mark>there is no instruction on the stack, we just jump to another legitimate syscall</mark>.

</li>

</ul>

## Buffer Overflow Defense

### Better Programming & Code Analysis

- Better programming practices (use type safe languages)
  > `strcpy()`, `strcat()`, `sprintf()` are not safe
- Statically analyzing the source code
- Dynamically detecting overflow
  > Valgrind for memory debugging and leak protection<br />Fuzzing - provide all kinds of inputs

### Using hardware/OS mechanism

- <mark>Non-executable stack</mark>
  > Mark stack as non-executable, so shell code on stack will not work.<br />But it doesn’t prevent a `return to libc` exploit
- <mark>Stack randomization</mark>
  > Randomly shifting the address of whole stack, but the relative address stays the same. So hackers can still using local variable relative address to locate `ret`.
- <mark>Canaries</mark>

  <blockquote>

  Run-Time check is a special values placed between the local and ret values. After function call, the integrity of canary values are checked.

  ![](/images/blog/unix-buffer-overflow/27.webp)

  But hacker can overwrite with exact canary content.

  ![](/images/blog/unix-buffer-overflow/28.webp)

  </blockquote>
