---
title: UNIX Security Introduction
description: ""
date: 2023-08-04
tags:
  - Operating System
  - Security
  - Linux
---

## UNIX Introduction

### Operating Systems and Security

> OS security typically consists of the following **four** items

1. **Login and user accounts**
   - Info about users are stored in accounts
   - This includes *privileges* granted to a user
   - *Identification* and *anthentication* identify a user
2. **Access control**
   - *Permissions* on resources can be set by the admin
   - Permissions will depend on the user’s identity
3. **Audits**
   - Security involves *prevention* and *detection*
   - Mechanisms are needed to determine security violations
4. **Configuration management**
   - Updating OS based on security needs

### UNIX Background

UNIX is originall intended for <u>one computer with multiple users</u>

- So that user mistakes can be isolated
- Initial UNIX design didn’t have security in mind, the trust association is: If you connect to mainframe, then I must trust you

## UNIX System & Security

### UNIX Mechanisms

![](/images/blog/unix-security/01.webp)

- UNIX program runs as either `kernel` or `user`,  which correspond to complete or limited control of all resources

### Runlevel

<aside class="callout">

**Runlevel** is a state or mode state of the machine after boot. It defines what the computer does in a general sense.

</aside>

- There are **Seven** runlevels

  ![](/images/blog/unix-security/02.webp)

  <blockquote>

  For example, our AWS VM has a run level equals 5, so we have graphical user interface. To check runlevel, use `runlevel` in CLI.

  ![](/images/blog/unix-security/03.webp)

  <mark>System’s runlevel gives you an idea of the computer, e.g. whether it’s a single user computer, a server, etc.</mark>

  </blockquote>

- Consider UNIX system booting

  ![](/images/blog/unix-security/04.webp)

  1. `init` process starts → kick off everything
  2. `init` determines the default runlevel (set by admin)
  3. `init` runs the scripts associated with the runlevel, which are located in `/etc` directory with one directory per runlevel

### Login and User Accounts

#### Password

- In UNIX, users are identified by **user names**
  - Authenticated by passwords
  - Passwords are ***encrypted*** and stored in `/etc/passwd`
- In `/etc/passwd`, every user’s row looks like:

  ![](/images/blog/unix-security/05.webp)

  ![](/images/blog/unix-security/06.webp)

  The root user always has UID = 0, which provides the highest level of permissions in Unix

  - If the password is empty, password is not required
  - If the password starts with an `*`, the user cannot login
- `/etc/passwd` is readable by any user (in the good old days), but only root can write to this file
  - **Security risk**: user can elevate privileges by setuid and modify readonly files
- `/etc/passwd` and **Shell**
  - Shell is the command line environment given to the account

    ![](/images/blog/unix-security/07.webp)

  - If the shell is `/usr/sbin/nologin` or `/bin/false` then **Cannot** login

  <details>
  <summary>Why have an account you cannot log into?</summary>

  > Every process has to run by an owner, so admin may want to create a user to run certain processes. So that admin can kill these processes by kill corresponding user.

  1. Security: In some cases, a process or service may require access to certain system resources, such as files or network ports, but does not need a user shell or interactive login. By creating a dedicated system account for the process or service, system administrators can restrict access to the necessary resources while minimizing the risk of unauthorized access.
  2. Process isolation: Sometimes, it is necessary to create a user account to run a particular process, but it is not desirable to allow the user to log in interactively or run other programs. For example, a web server may need a dedicated user account to run its processes, but that user should not have shell access or be able to run other programs on the system.
  3. Backup purposes: Creating system accounts for backup purposes, such as for system-level backups, allows for a clean and organized environment. It also helps to ensure that no user or program can interfere with the backup process.

  </details>

- **Shadow Files**
  - There is a security risk with a readable password, so people create shadow files to store hashed password now
  - If a shadow password file is used
    - An x is placed for the password in `/etc/passwd`

      ![](/images/blog/unix-security/08.webp)

    - The actual encrypted password is located in `/etc/shadow` and this file is readable only by **root**

      ![](/images/blog/unix-security/09.webp)

  - To crack the password, you need to creack these two files and merge. You also can use [<b><mark>John the Ripper (JTR)</mark></b>](https://github.com/openwall/john) to do the <u>cracking automatically</u>.
- <b>Interpret </b>`/etc/shadow`

  ![](/images/blog/unix-security/10.webp)

#### User Types

- **User Types**
  - `Root` is superuser that has complete control of the system
    - Root has `UID = 0` and can do almost everything
    - Root **can** become any other user, change passwd file
    - Root **cannot** change system read-only file
  - `Normal user` can log in to the system with restricted access
  - `System user` cannot log in, and their accounts are used for specific system purposes.
- **UNIX User UID and Group IDs**

  <ul>

  <li>

  UNIX represents users by a user name and a user ID. UID is linked to user name in the passwd file

  ![](/images/blog/unix-security/11.webp)

  </li>

  <li>

  **Group ID**: Collecting users in groups for access control.

  ![](/images/blog/unix-security/12.webp)

  </li>

  </ul>

#### Discussion about Root Privilage Control

- <mark>`sudo`</mark>, a more control method to share root. `sudo = superuser do`
  - `sudo` can specifies the allowed privileged commands → prevent sudo - all or nothing (more <u>granularity</u>)

    ![](/images/blog/unix-security/13.webp)

- <mark>`sudoers.d`</mark> is a directory contains files specifying the permissions per group or user
  - The file path is `/etc/sudoers.d`, and the idea is same as `sudoers`, we just place entries in separate files
  - This change was done to prevent mistakes while updating `sudo` permissions, The file `sudoers` still exists even with this update

  ![](/images/blog/unix-security/14.webp)

  ![](/images/blog/unix-security/15.webp)

- <b><mark><u>Controlled Invocation</u></mark></b><b> →</b> a more careful way of giving privilage than sudo
  - UNIX may occasionally need superuser privilage to perform certain tasks
  - The solution is **Set User ID** (`SUID`) and **Set Group ID** (`SGID`) **programs**
    - **Programs** that are SUID give a user a different status during their execution, then return to normal once complete
    - The list of programs that has **SUID** bit turned on is: (You can also write your own `setuid()` program)

      ![](/images/blog/unix-security/16.webp)

      <aside class="callout">

      In UNIX, the **`perm -4000`** option is used as the **`find`** command searches for files with the "`setuid`" bit set. This special permission bit allows a program to be executed with the <u>privileges of the file owner</u>, rather than the user executing the program. It is used to give users temporary elevated privileges to perform certain tasks requiring special permissions.

      </aside>

  - A program that sets the UID looks like:

    ![](/images/blog/unix-security/17.webp)

    <ul>

    <li>

    SUID program is very dangerous in terms of security, because people could hack you during the program is root, such as spawn a shell.

    </li>

    </ul>

### UNIX File Structure

- UNIX arranges file in a **tree** structure.
  - Base of tree is called root `/`
  - System consists of <u>files</u> and <u>directories</u>
  - Every directory contians two files `.` and `..`
  - Every file has an owner and belongs to a group
- For each file, the representation is:

  ![](/images/blog/unix-security/18.webp)

  - First character indicates if the file is a directory `d`
  - `rwx` means read, write, and execute
- If the file is a **SUID** program, then the representation is:

  ![](/images/blog/unix-security/19.webp)

  - The reason why "`s`" is used in place of "`x`" when the `setuid` or `setgid` bit is set on a file is to indicate that the execute bit is implicitly set along with the special bit.
- To change the permissions of a file, use the command `chmod`
  - Add permission → `chmod who+perm fileName`
  - Remove permission → `chmod who-perm fileName`
- Check detailed information about file via `stat` command

  ![](/images/blog/unix-security/20.webp)

### UNIX Command Shell

#### Bash Environment

<aside class="callout">

Bash keeps track of settings and details through an area it maintains called the ***environment***.

- Environment is an area that is built every time that a session is started
- Contains variables that define system properties
- To display the variables, use command `env` or `printenv`

</aside>

- Every time a shell session started:
  - A process takes place to gather and compile information that should be available to the shell process and its child processes

#### Environment Variable and Shell Variable

- What is **Environment Variable**?

  <aside class="callout">

  Environment variables are named dynamic values (often set by OS)

  - Should be considered ***hidden*** **input**, and it may affact program behavior
  - Ignoring how they are set is dangerous
  - When executed, a program may use these variables for system access

    <ul>

    <li>

    Such as PATH, IFS, LD\_LIBRARY\_PATH, and LD\_PRELOAD

    </li>

    </ul>

  ![](/images/blog/unix-security/21.webp)

  To check current environment variables, use `printenv` command.

  </aside>

  - <u>Environment variables can be created from local shell variables</u> by `export`

    ![](/images/blog/unix-security/22.webp)

  - You can also create environment variable using `env` command

    ![](/images/blog/unix-security/23.webp)

- What is <b>Bash Variable </b>or **Shell Variable** (a more general term)?

  <aside class="callout">

  Bash is a command line interface for the OS, and is also a programming/scripting language. Bash allows declare variables by `=`

  - These variables are used to manage **ephemeral** data, like current working directory
  - Contained within the shell in which they were set or defined

    ![](/images/blog/unix-security/24.webp)

  </aside>

  <details>
  <summary>What is the difference between environmental variable and bash variable</summary>

  **Environment variables** are system-wide variables that are set and used by all programs running on a machine, while **bash variables** are specific to the shell or command being executed.

  **Environment variables** can be set by the operating system or by users, and they provide information about the system and its configuration. **Bash variables**, on the other hand, are used to store information that is specific to a particular shell or command, such as the output of a command or a user-defined value. Bash variables are not accessible outside of the shell or command in which they are defined, while environment variables can be accessed by any program running on the machine.

  </details>

  <details>
  <summary>What is the difference between Bash and Shell variable?</summary>

  <u>A shell variable and a bash variable are essentially the same thing</u>, but they are often used in different contexts. "Shell variable" is a more general term that refers to a variable within any Unix-like shell (e.g., sh, bash, zsh, ksh, etc.), while "bash variable" specifically refers to a variable within the Bash (Bourne Again Shell) environment.

  Both types of variables are used to store and manipulate data in the shell environment, and they can be set, accessed, and modified using shell scripting. However, the distinction is mainly based on the context in which they are used.

  Here's a **summary**:

  - Shell variable: A variable used within any Unix-like shell environment. It is a more general term.
  - Bash variable: A variable specifically used within the Bash shell environment.

  </details>

#### Shell Shock

- Bash environment variables can also <b><u>export function definitions</u></b>

  ![](/images/blog/unix-security/25.webp)

  - If a variable string starts with `() {`, then this is a function
- The case of shell shock

  ![](/images/blog/unix-security/26.webp)

  - For the third command above, `echo bar` should not be executed at all
  - Thus, this bash issue allows arbitrary command execution

#### PATH

- Users interact with the OS through shell, such as zsh, bash, etc.
- As a matter of convience users can type run a program command without specifiying the complete path. For example, to run `ls`, you don’t need to type `/bin/ls`.
  - The shell knows where to look using a PATH variable
- The PATH environment variable lists the directories to search and it’s defined in `.cshrc` or `.bashrc` file depends on the shell you use and located at home directory.
  - The <b><u>order matters</u></b>! It determines the look up sequence.

    ![](/images/blog/unix-security/27.webp)

<b><mark>Path Attack</mark></b>

> Assume system admin has `.` at the beginning of their PATH, so looking for local first

1. Create a file called `ls` with the following content
   ```bash
   cp /bin/sh ./Stuff/sume
   chmod 4555 ./Stuff/sume
   rm -f $0
   exec /bin/ls $1
   ```

   1. **`cp /bin/sh ./Stuff/sume`**: Copies the **`/bin/sh`** file to **`./Stuff/sume`**.
   2. **`chmod 4555 ./Stuff/sume`**: Changes the permissions of the **`./Stuff/sume`** file to allow it to run with elevated privileges.

      ![](/images/blog/unix-security/28.webp)

   3. **`rm -f $0`**: Deletes the script file after it has been run.
   4. **`exec /bin/ls $1`**: Runs the **`/bin/ls`** command with the specified argument, if any.
2. Create another unreadable file with whatever content
   ```bash
   # create a file named -f, since admin may try rm -f
   chmod 700 .; touch ./-f
   ```
3. You tell the admin you cannot erase one of your files (`-f`)
4. Admin becomes root moves to your directory and enters `ls`, then your customized version of `ls` is executed
5. You now have root for `sume`, a root shell interpreter

   ![](/images/blog/unix-security/29.webp)

<b><mark>LD\_LIBRARY\_PATH and LD\_PRELOAD</mark></b>

- `LD_LIBRARY_PATH` is used when searching for dynamic libraries, every unix program depends on `libc.so`
  - If these libraries are exchanged with malware, attackers can place a fake libc.so to user’s machine and get executed everytime
    ```bash
    # /tmp will be searched first for libc.so
    setenv LD_LIBRARY_PATH /tmp:$LD_LIBRARY_PATH
    ```
  - Most C runtime libraries have fixed this issue by ignoring the `LD_LIBRARY_PATH` var when the EUID (Process ID) is not equal to the UID (User ID)
- `LD_PRELOAD` is the environment variable used to preload shared libraries
  - This allows the user to replace standard C library functions, such as the C interfaces to system calls

    ![](/images/blog/unix-security/30.webp)

#### IFS Environment Variable

- IFS stands for **Internal Field Separators**, which identifies characters to be interpreted as whitespace
- IFS malicious usage:

  ![](/images/blog/unix-security/31.webp)

<b><mark>Vi + PATH \_ IFS Attack</mark></b>

- Context

  ![](/images/blog/unix-security/32.webp)

- **Attack** method

  ![](/images/blog/unix-security/33.webp)

#### Avoid Environment Variables

<aside class="callout">

In C and C++, the `environ` variable is an external pointer variable that is part of the standard library. It is used to access the environment of the current process, which includes a list of environment variables and their values.

</aside>

It possible to avoid environment variables in the program by set external pointer variable `environ` to zero (NULL).

![](/images/blog/unix-security/34.webp)

### Session Configuration Files

<aside class="callout">

Once a user logs in, a session starts.

- Session is configured using a set of hidden files
- These configuration files are located in the home directory

![](/images/blog/unix-security/35.webp)

</aside>

- Shell environment is configured using `.bashrc` and `.config` files
  - File `.config` executed <u>per login</u>
  - File `.bashrc` executed for each <u>new terminal</u> as new shell starts
- Let take a close look at `.bashrc` file

  ![](/images/blog/unix-security/36.webp)

  - `alias` is a place to hide commands

### Root Processes

- <mark>Three Processes</mark>
  - <b><u>Initial boot</u></b> uses scripts in `/etc/rc*.d` depends on the system runlevel
    - In this boot script directory, for example, `/etc/rc5.d`, is a directory that contains symbolic links to scripts in the `/etc/init.d` directory
  - `/etc/init.d` is a directory that stores the <b><u>init scripts</u></b> responsible for managing <b><u>system services</u></b>. These scripts are typically executed by the system init processes.
  - Network processes `/etc/inetd.conf` sets the list of network services started at boot
- <mark>Commands</mark>
  - `ps` or `top`: show what is running

    ![](/images/blog/unix-security/37.webp)

  - `ps -ef` will list the Parent Process ID (**PPID**)

    ![](/images/blog/unix-security/38.webp)

    - `ps` shows the current process running and we can determine if we started them
- <b><mark>`init`</mark></b><b><mark> Services</mark></b>
  - Started automatically during the boot or runlevel change, it locates in `/etc/init.d` or `/etc/rc.d/init/d`

    ![](/images/blog/unix-security/39.webp)

  - To start, restart, or stop a service, use following command

    ![](/images/blog/unix-security/40.webp)

- <b><mark>`inetd`</mark></b><b><mark> Services</mark></b>
  - This service is used for Internet based services and generally started via init scripts

    <details>
    <summary><code>inetd.conf</code> file contents</summary>

    ```bash
    seed@ip-10-4-149-82:/etc$ cat inetd.conf
    # /etc/inetd.conf:  see inetd(8) for further informations.
    #
    # Internet superserver configuration database
    #
    #
    # Lines starting with "#:LABEL:" or "#<off>#" should not
    # be changed unless you know what you are doing!
    #
    # If you want to disable an entry so it isn't touched during
    # package updates just comment it out with a single '#' character.
    #
    # Packages should modify this file by using update-inetd(8)
    #
    # <service_name> <sock_type> <proto> <flags> <user> <server_path> <args>
    #
    #:INTERNAL: Internal services
    #discard		stream	tcp	nowait	root	internal
    #discard		dgram	udp	wait	root	internal
    #daytime		stream	tcp	nowait	root	internal
    #time		stream	tcp	nowait	root	internal

    #:STANDARD: These are standard services.
    telnet		stream	tcp	nowait	telnetd	/usr/sbin/tcpd	/usr/sbin/in.telnetd

    #:BSD: Shell, login, exec and talk are BSD protocols.

    #:MAIL: Mail, news and uucp services.

    #:INFO: Info services

    #:BOOT: TFTP service is provided primarily for booting.  Most sites
    #       run this only on machines acting as "boot servers."

    #:RPC: RPC based services

    #:HAM-RADIO: amateur-radio services

    #:OTHER: Other services
    #<off># sane-port	stream	tcp	nowait	saned:saned	/usr/sbin/saned saned
    ```

    </details>

  - `netstat` command: stands for network statistics. It displays information about active network connections, including the local and remote addresses, the protocol used (TCP or UDP), the state of the connection (e.g. established, listening, etc.), and the process ID (PID) of the application or service that is associated with the connection.
    ```bash
    # shows all active TCP connections
    netstat -atn
    ```
  - Common **options** for the `netstat` command include:
    - **`a`** : displays all active connections, including listening ports
    - **`n`** : displays network addresses as numeric values rather than resolving them to host and domain names
    - **`p`** : displays the process ID and name of the program that is associated with each connection
    - **`r`** : displays the system's routing table

### Cron Job

<aside class="callout">

`cron` is a program that allows Unix users to automatically execute commands or scripts (a cron job) at specific dates and times. Examples of cron jobs include deleting temporary files every hour, restarting ssh, or backing up files every day.

- `cron` is a daemon process, so it’s dormant until it’s required

![](/images/blog/unix-security/41.webp)

</aside>

- <b><mark>How to control cron jobs?</mark></b>
  - Go to directory `/etc`, it contains `cron` sub-directories

    ![](/images/blog/unix-security/42.webp)

    - Each sub-dir has a repeat time associated with it
    - You can place a script in the sub-dir you want
    - An **Example** of daily script

      ![](/images/blog/unix-security/43.webp)

    - More script time flexibility is provided in the `/etc/crontab` file

      ![](/images/blog/unix-security/44.webp)

#### What is Running?

```bash
# List all active system services
systemctl list-units --type=service --state=running
```

![](/images/blog/unix-security/45.webp)

<aside class="callout">

<b>`systemctl`</b><b> </b>is a command-line tool used to manage and control the <b>`systemd`</b><br /> system and service manager in modern Linux distributions.

- `systemctl start service-name`: Starts a specific service.
- `systemctl stop service-name`: Stops a specific service.
- `systemctl restart service-name`: Restarts a specific service.
- `systemctl enable service-name`: Enables a specific service to start at boot time.
- `systemctl disable service-name`: Disables a specific service from starting at boot time.
- `systemctl status service-name`: Displays the status of a specific service.
- `systemctl list-units`: Lists all active units (services, targets, sockets, etc.) on the system.
- `systemctl list-unit-files`: Lists all unit files (configuration files) installed on the system.

</aside>

---

```bash
# Display the running processes in tree format
pstree
```

![](/images/blog/unix-security/46.webp)

---

```bash
# Inspect based on network connectivity
netstat -a
```

![](/images/blog/unix-security/47.webp)

- Unix domain sockets are **interprocess** communication

### Audit Trails

<aside class="callout">

Linux keeps a good audit trail of happening on the system.

- <b><u>Things are logged</u></b>: crashes, login/logout, su, login failures, dialouts printer use/errors, mail/www, firewall exceptions
- <b><u>Things are not logged</u></b>: failed file access, some network access (rcp), file changes, password changes, www access failures, and superuser actions

</aside>

- **`syslog()`**
  - Logging is done by `syslogd` **daemon**, and it has UDP support
  - The file `/etc/rsyslog.conf` indicates <u>log locations</u>

    <blockquote>

    *selector + action*

    ![](/images/blog/unix-security/48.webp)

    </blockquote>

#### Intrusion Detection System

- To check all authentication attempts
  ```bash
  sudo grep "sshd" /var/log/auth.log
  ```

  ![](/images/blog/unix-security/49.webp)

### Make Unix/Linux More Secure

1. Set a password to disallow booting from USB, DVD, etc…
   > This is done by setting a BIOS or UEFI password, which requires a password to be entered before the system can boot from removable media such as USB drives or DVDs. This helps prevent unauthorized access to the system or the installation of malware from external sources.
2. Disable special and default accounts

   <blockquote>

   Unix/Linux systems come with several default accounts, including **`lp`**, **`sync`**, **`shutdown`**, **`operator`**, and others. These accounts are typically used for system processes and are not intended for general user access. It is recommended to disable these accounts or change their passwords to prevent unauthorized access.

   ```bash
   # Locks the lp account, preventing anyone from logging in that account.
   sudo usermod -L lp
   ```

   </blockquote>

3. Set a timeout (TMOUT=) in the profile file (users and root)
4. Disable console-equivalent user access to reboot, shutdown
5. Disable unnecessary network services (with caution)
   1. Edit the `/etc/inetd.conf` file
   2. make certain root is the owner of `/etc.inetd.conf`
   3. Change permission of `/etc/inetd.conf` to 600 (read and write permissions for the owner of the file and no permissions for the group and others.)
6. Use `TCP_WRAPPERS` and/or firewall to control access
7. Do not display the system issue information at log in
8. Review the `/etc/host.conf` file
   1. This file resolves IP names to addresses
   2. You can make it ask DNS first or have the file resolve
9. Immunize `/etc/services` file, the file that maps ports to applications
   1. Prevent unauthorized deletion or addition of services
   2. Use the command `chattr +i /etc/services`
10. Make signatures of any setuid programs, such as MD5 signature
11. Prevent users from `su` , should do `sudo` instead
12. Have the shell erase the command history of a user at log out, can be done with `/bash_logout` file
13. Disable the Control-Alt-Delete keyboard shutdown command
14. Fix permissions under `/etc/rc.d/init.d` direcotry for script files
    1. Use the command `chmod -R 700 /etc/rc.d/init.d/*`
15. Turn off the machine and don’t turn it on ever
