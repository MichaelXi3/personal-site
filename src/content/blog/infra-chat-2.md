---
title: "From Bits to Systems: First Principles Thinking of Storage"
description: Every time you hit Save, a tiny switch flips—somewhere deep in silicon or across the cloud. That flip is where all of storage begins.
date: 2024-11-18
tags:
  - Storage System
  - Operating System
---

## Why start from first principles?

Any truly valuable discipline is, at its core, rooted in first principles, an indivisible, atomic theorem that reveals the essence of a subject once every assumption has been stripped away.

![](https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb21784f2-e833-4b9b-a2c3-537bd44dc830_5760x3840.jpeg)

## Durability: The Fundamental Requirement

In storage, the most basic first principle is that ***a bit must be either 0 or 1*** and must remain distinguishable and durable. From this requirement arises the concept of persistence: a storage device or system must guarantee data durability. Persistence, however, is never granted. It depends on the medium that holds the data and involves the performance of writes and reads as well as the mechanisms for error correction and self-recovery.

### From Stone Tablets to Flash: Redundancy and Error Correction

Ancient people carved text onto stone tablets to achieve durability, but writing on stone was slow, costly, and impossible to modify. Later, vast amounts of data were written onto paper, speeding up the writing process, yet paper was hard to preserve, and many texts did not survive. The workaround was massive copying, which led us to the concept of redundancy in storage.

With computers, humanity created a new way to represent data: ***bits***, using binary to encode characters. New storage media—magnetic disks and, later, flash memory—were invented to hold this binary data. Disks are more reliable than paper yet still inferior to stone; over time, magnetic particles lose charge. In flash, electrons leak and the stored charge disappears. Hence storage systems need error-correction mechanisms to recover bits lost over time or through mishandling. From the perspective of data durability, this introduces redundancy and error correction.

## Accessibility and Performance

Beyond durability lies accessibility: the ability to read and write data, or system throughput. Consider reads first. The core issue is how quickly we can determine the state of a bit. Real-world storage is organized in multiple layers. From multi-level caches to main memory, from SSDs to HDDs and the cloud, a bit is always the same bit, yet its position in the hierarchy directly determines access speed. This gives rise to caching, read-ahead techniques, and many optimizations. If data is already in memory—or even in the CPU cache line—when it is needed, read performance rises dramatically.

- **CPU Caches**: \~0.5-20ns
- **RAM (DRAM)**: \~50–100 ns
- **NVMe SSD**: \~10–100 µs
- **HDD**: \~5–15 ms
- **Remote Disk** (e.g., iSCSI, NFS): \~10–100 ms depending on network
- **Cloud Object Storage** (e.g., S3, GCS): \~100 ms – multiple seconds

## Writes, Atomicity, and Crash Consistency

The information must also be writable. In production environments, writes often occur alongside high-concurrency reads, so ensuring correctness under concurrent access is crucial. When a write coincides with a system crash, the design must prevent inconsistency. This leads to the problems of write atomicity and crash consistency. Failures caused by crashes fall into two categories:

- **Soft failures**: data in write buffers is lost during a crash and must be recovered through logging.
- **Hard failures**: hardware damage causes data loss; recovery requires RAID reconstruction or multi-replica voting.

## Cost: Compression, Compaction, Deduplication

When several bits encode the same information, the system should deduplicate or compress them, reducing the ***cost per gigabyte***. Whether the extra computation and indexing overhead is worthwhile depends on deduplication and compression ratios. After reliability and performance, cost becomes a critical practical concern. From here emerge three major data-handling techniques: compression, compaction, and deduplication.

## The Balancing Act

In the end, every storage-system design question reduces to finding the right balance between ***reliability, performance, and cost***, applying appropriate techniques to different data tiers, business SLAs, and failure models. Once we understand the first principle that a bit is either 0 or 1, everything else in storage can be seen as an elaboration on these three cornerstones.
