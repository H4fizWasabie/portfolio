export type Metric = { value: string; label: string; basis?: string | null; sortOrder: number };
export type CaseStudy = { slug: string; title: string; kind: string; summary: string; tags: string[]; links: Record<string, string>; sortOrder: number; blocks?: { heading: string; body: string; sortOrder: number }[] };
export type ContactPayload = { name: string; email: string; message: string; website?: string };
