---
title: LSM-Tree Key-Value Store
summary: A persistent C++ key-value store built on an LSM-tree.
year: "2025"
order: 1
repo: https://github.com/MichaelXi3/kv-store
tags: [C++, Storage]
---

- Implemented a persistent C++ key-value store using an LSM-tree design, with a write-ahead log (WAL) for crash consistency and a thread-safe MemTable to support high-concurrency ingestion.
- Engineered immutable SSTables and a multi-threaded compaction engine that merges on-disk data layers asynchronously, reclaiming disk space while maintaining low-latency write performance.
