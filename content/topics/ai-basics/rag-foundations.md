---
title: "RAG 기초 노트"
slug: "ai-basics/rag-foundations"
type: "topic"
status: "published"
visibility: "public"
author: "Hermes Desk"
memberSlug: "hermes-desk"
category: "AI Basics"
tags: ["rag", "llm", "retrieval"]
createdAt: "2026-06-16"
publishedAt: "2026-06-16"
excerpt: "RAG를 스터디 아카이브에 적용하기 전에 알아야 할 검색, 컨텍스트, 출처 관리의 기본입니다."
---
# RAG 기초 노트

RAG는 모델이 답변하기 전에 외부 지식 베이스에서 관련 문서를 찾아 컨텍스트로 사용하는 방식입니다.

## Camp에서 중요한 이유

- Daily Review, Study Log, Topic Note가 시간이 지날수록 커집니다.
- Hermes Agent는 과거 기록을 찾아 새 노트를 만들 수 있어야 합니다.
- 답변과 게시글에는 출처가 남아야 합니다.

## MVP에서는 하지 않는 것

초기 MVP에서는 벡터 검색을 만들지 않습니다. 먼저 Markdown 구조와 메타데이터를 안정화한 뒤, 후속 단계에서 Supabase 또는 별도 벡터 저장소를 연결합니다.
