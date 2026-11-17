export type MediaSlot =
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | { kind: 'video'; src: string; poster?: string; caption?: string }
  /** An empty slot shown as a styled frame until real work is added. */
  | { kind: 'placeholder'; label: string; aspect?: 'portrait' | 'landscape' | 'square' }

export interface Project {
  slug: string
  name: string
  role: string
  /** One line for cards and the magazine spread. */
  summary: string
  /** Longer case-study paragraphs. */
  body: string[]
  /** What she does on this project. */
  contributions: string[]
  media: MediaSlot[]
  /** Background colour of the magazine spread page. */
  tone: 'cream' | 'lilac' | 'gold' | 'lavender'
}
