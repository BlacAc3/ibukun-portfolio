import type { Project } from '../types'
// Stills of each Instagram post: shown instantly, before (and instead of) Instagram's embed.
import igDfF0iEDEdC6 from '../assets/instagram/DfF0iEDEdC6.jpg?w=540&quality=80&format=webp'
import igDe7hQhWEfBv from '../assets/instagram/De7hQhWEfBv.jpg?w=540&quality=80&format=webp'
import igDfks2EskXfv from '../assets/instagram/Dfks2EskXfv.jpg?w=540&quality=80&format=webp'
import igDfkyQwtjdX2 from '../assets/instagram/DfkyQwtjdX2.jpg?w=540&quality=80&format=webp'
import igDfrKYTXjSpM from '../assets/instagram/DfrKYTXjSpM.jpg?w=540&quality=80&format=webp'
import igDf17sV8NU_C from '../assets/instagram/Df17sV8NU_C.jpg?w=540&quality=80&format=webp'
import igDfzVrxARHG5 from '../assets/instagram/DfzVrxARHG5.jpg?w=540&quality=80&format=webp'
import igDfh1orTRnHT from '../assets/instagram/Dfh1orTRnHT.jpg?w=540&quality=80&format=webp'
import igDe1DLc9R_zG from '../assets/instagram/De1DLc9R_zG.jpg?w=540&quality=80&format=webp'

/**
 * To add real work, replace a `placeholder` slot with:
 *   { kind: 'image', src: importedImage, alt: '…', caption: '…' }
 *   { kind: 'video', src: '/videos/clip.mp4', poster: '/videos/clip.jpg', caption: '…' }
 *   { kind: 'instagram', url: 'https://www.instagram.com/p/CODE/', thumb: importedStill, handle: 'account' }
 *     (or /reel/CODE/; save a still of the post in src/assets/instagram and import it above)
 * Paste Instagram links without the ?… share suffix — it only tracks who shared it.
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
      { kind: 'instagram', url: 'https://www.instagram.com/p/DfF0iEDEdC6/', thumb: igDfF0iEDEdC6, handle: 'onesipata_time' },
      { kind: 'instagram', url: 'https://www.instagram.com/p/De7hQhWEfBv/', thumb: igDe7hQhWEfBv, handle: 'onesipata_time' },
      { kind: 'instagram', url: 'https://www.instagram.com/p/Dfks2EskXfv/', thumb: igDfks2EskXfv, handle: 'onesipata_time' },
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
      { kind: 'instagram', url: 'https://www.instagram.com/p/DfkyQwtjdX2/', thumb: igDfkyQwtjdX2, handle: 'globalgiftt' },
      { kind: 'instagram', url: 'https://www.instagram.com/p/DfrKYTXjSpM/', thumb: igDfrKYTXjSpM, handle: 'globalgiftt' },
      { kind: 'instagram', url: 'https://www.instagram.com/reel/Df17sV8NU_C/', thumb: igDf17sV8NU_C, handle: 'globalgiftt' },
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
      { kind: 'instagram', url: 'https://www.instagram.com/reel/DfzVrxARHG5/', thumb: igDfzVrxARHG5, handle: 'thetorchbearers_globalhq' },
      { kind: 'instagram', url: 'https://www.instagram.com/reel/Dfh1orTRnHT/', thumb: igDfh1orTRnHT, handle: 'thetorchbearers_globalhq' },
      { kind: 'instagram', url: 'https://www.instagram.com/reel/De1DLc9R_zG/', thumb: igDe1DLc9R_zG, handle: 'thetorchbearers_globalhq' },
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
    media: [],
    tone: 'lavender',
  },
]

export const getProject = (slug: string | undefined) => projects.find((p) => p.slug === slug)
