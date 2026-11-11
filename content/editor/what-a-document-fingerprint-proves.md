---
title: What a document fingerprint proves, and what it does not
date: 2026-11-11
summary: Anchoring a hash on a chain proves a file has not changed since a moment in time. It says nothing about who agreed to it. The difference matters.
---

"Put the document on the blockchain" is one of the most repeated sentences in this industry, and one of the least precise. Almost nobody puts a document on a chain. What goes there is a fingerprint.

## The fingerprint

A hash function turns any file into a short string. The same file always gives the same string. Change a single character, say a weight of 14.2 tonnes to 14.7, and the string comes out completely different. There is no "nearly the same" fingerprint.

Write that string to a ledger nobody can quietly edit, with a timestamp, and you have made a promise that can be checked by anyone later: the file you are holding today is, bit for bit, the file that existed at that moment.

## What that proves

It proves **integrity** and **time**. If the fingerprints match, the document has not been altered since it was anchored. If they do not match, it has, and nobody needs to trust either side to see that.

## What it does not prove

It does not prove the document was true when it was written. A wrong weight, anchored, is a permanently verifiable wrong weight.

It does not prove who agreed to it. That needs signatures, tied to identities that someone has actually checked, and recorded separately.

And it does not keep the document private or public. The fingerprint reveals nothing about the contents, which is exactly why it is safe to anchor.

## Why the distinction matters

Systems that blur these three things, integrity, truth and consent, tend to oversell the first and quietly skip the other two. The useful designs I have seen treat the fingerprint as one small, honest building block: it settles the question "is this the same file?" so that people can argue about the things that are actually worth arguing about.

I made a twenty second film of the idea. It is on [my site](https://www.pratyushshivam.com/films/document-fingerprint/).
