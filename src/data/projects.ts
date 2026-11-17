import type { Project } from '../types'

/**
 * To add real work, replace a `placeholder` slot with:
 *   { kind: 'image', src: importedImage, alt: '…', caption: '…' }
 *   { kind: 'video', src: '/videos/clip.mp4', poster: '/videos/clip.jpg', caption: '…' }
 * Videos go in /public/videos; images are best imported from src/assets.
 */
export const projects: Project[] = [
  {
    slug: 'one-sip-at-a-time',
    name: 'One Sip at a Time',
    role: 'Founder & creative director',
    summary: 'A digital lifestyle magazine about café culture, food discoveries and the small details that make a day memorable.',
    body: [
      'One Sip at a Time is a digital lifestyle magazine exploring café culture, lifestyle experiences, food discoveries and the little details that make everyday experiences memorable.',
      'As founder and creative director, I oversee the creative identity, editorial direction, social media presence and content development of the platform — from choosing which café to visit, to the final caption.',
    ],
    contributions: ['Café reviews', 'Photography & videography', 'Editorial storytelling', 'Social media content', 'Brand collaborations'],
    media: [
      { kind: 'placeholder', label: 'Café review reel', aspect: 'portrait' },
      { kind: 'placeholder', label: 'Table-top photo series', aspect: 'square' },
      { kind: 'placeholder', label: 'Instagram grid', aspect: 'portrait' },
    ],
    tone: 'gold',
  },
  {
    slug: 'clario-consultancy',
    name: 'Clario Consultancy',
    role: 'Content creator & videographer',
    summary: 'Video and digital content for an agency focused on visibility, positioning and growth for businesses and individuals.',
    body: [
      'Clario Consultancy helps businesses and individuals with visibility, positioning, digital presence, marketing and growth.',
      'I contribute to the agency’s digital content and communication — developing content ideas, filming videos, editing, planning and creating visual materials that explain the agency’s services and expertise.',
    ],
    contributions: ['Content ideas', 'Filming', 'Video editing', 'Content planning', 'Visual materials'],
    media: [
      { kind: 'placeholder', label: 'Brand explainer video', aspect: 'landscape' },
      { kind: 'placeholder', label: 'Social reel', aspect: 'portrait' },
      { kind: 'placeholder', label: 'Carousel design', aspect: 'square' },
    ],
    tone: 'cream',
  },
  {
    slug: 'tbmi-the-torch-place',
    name: 'TBMI — The Torch Place',
    role: 'Assistant head, content team',
    summary: 'Documenting services, programmes and special events for a church community through film and photography.',
    body: [
      'At TBMI – The Torch Place, I contribute to the church’s creative and media activities: content planning, filming, video editing, event coverage and promotional content.',
      'I also support the coordination of the content team and help document church programmes, services and special events through visual storytelling.',
    ],
    contributions: ['Event coverage', 'Video editing', 'Promotional content', 'Team coordination', 'Content planning'],
    media: [
      { kind: 'placeholder', label: 'Service highlights', aspect: 'landscape' },
      { kind: 'placeholder', label: 'Event promo', aspect: 'portrait' },
      { kind: 'placeholder', label: 'Community moments', aspect: 'square' },
    ],
    tone: 'lilac',
  },
  {
    slug: 'the-oasis-of-peace',
    name: 'The Oasis of Peace',
    role: 'Assistant creative',
    summary: 'On-the-ground photography and video, documenting activities and engagements alongside the creative lead.',
    body: [
      'I assist with visual documentation by accompanying the creative lead to activities and engagements, capturing photographs and videos as they happen.',
      'It is hands-on, in-the-moment work that keeps sharpening my practical photography and videography.',
    ],
    contributions: ['Photography', 'Videography', 'Event documentation', 'Supporting the creative lead'],
    media: [
      { kind: 'placeholder', label: 'Behind the scenes', aspect: 'portrait' },
      { kind: 'placeholder', label: 'Event photo set', aspect: 'landscape' },
    ],
    tone: 'lavender',
  },
]

export const getProject = (slug: string | undefined) => projects.find((p) => p.slug === slug)
