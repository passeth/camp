export type Member = {
  name: string;
  slug: string;
  role: string;
  bio: string;
  avatar: string;
  links: { label: string; href: string }[];
};

export const members: Member[] = [
  {
    name: "Camp Editorial",
    slug: "camp-editorial",
    role: "Study archive editor",
    bio: "스터디의 학습 기록, Daily Review, 주제별 노트, Teach Page를 정리하는 기본 편집자 프로필입니다.",
    avatar: "CE",
    links: [{ label: "Press", href: "/press" }],
  },
  {
    name: "Hermes Desk",
    slug: "hermes-desk",
    role: "AI-assisted research desk",
    bio: "후속 단계에서 Hermes Agent가 생성한 요약, 학습 노트, 게시 초안을 관리할 역할입니다.",
    avatar: "HD",
    links: [{ label: "Teach", href: "/teach" }],
  },
];

export function getMemberBySlug(slug: string) {
  return members.find((member) => member.slug === slug);
}
