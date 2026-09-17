import type { SiteBlock } from "./types";

export type PatternNode = {
  type: SiteBlock["type"];
  props: Record<string, unknown>;
  columnIndex?: number;
  children?: PatternNode[];
};

export type BlockPattern = {
  id: string;
  label: string;
  description: string;
  blocks: PatternNode[];
};

export const BLOCK_PATTERNS: BlockPattern[] = [
  {
    id: "hero",
    label: "Hero",
    description: "Large heading with subtitle and button",
    blocks: [
      {
        type: "section",
        props: { padding: 48, align: "center" },
        children: [
          { type: "heading", props: { text: "Welcome to your site", level: 1 } },
          {
            type: "text",
            props: { text: "Build something great with Dock. Drag, drop, and publish." },
          },
          { type: "button", props: { label: "Get started", href: "/", variant: "primary" } },
        ],
      },
    ],
  },
  {
    id: "two-column-features",
    label: "Two columns",
    description: "Side-by-side content columns",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          {
            type: "columns",
            props: { count: 2 },
            children: [
              {
                type: "heading",
                props: { text: "For your community", level: 3 },
                columnIndex: 0,
              },
              {
                type: "text",
                props: {
                  text: "Give members a clear home for cases, rules, and updates — without standing up a custom site.",
                },
                columnIndex: 0,
              },
              {
                type: "heading",
                props: { text: "Publish on your terms", level: 3 },
                columnIndex: 1,
              },
              {
                type: "text",
                props: {
                  text: "Draft in the builder, preview the live page, and ship when the layout feels right.",
                },
                columnIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cta",
    label: "Call to action",
    description: "Centered CTA with button",
    blocks: [
      {
        type: "section",
        props: { padding: 48, align: "center" },
        children: [
          { type: "heading", props: { text: "Ready to get started?", level: 2 } },
          { type: "text", props: { text: "Join thousands of communities using Dock." } },
          { type: "button", props: { label: "Learn more", href: "/", variant: "primary" } },
        ],
      },
    ],
  },
  {
    id: "content-stack",
    label: "Content stack",
    description: "Heading, text, and divider",
    blocks: [
      {
        type: "group",
        props: { gap: "md" },
        children: [
          { type: "heading", props: { text: "Section title", level: 2 } },
          { type: "text", props: { text: "Your paragraph content goes here." } },
          { type: "divider", props: { size: "md", style: "line" } },
        ],
      },
    ],
  },
  {
    id: "testimonial",
    label: "Testimonial",
    description: "Quote with author attribution",
    blocks: [
      {
        type: "section",
        props: { padding: 32, align: "center" },
        children: [
          {
            type: "quote",
            props: {
              text: "Dock made it effortless to launch our community site.",
              author: "Community Admin",
            },
          },
        ],
      },
    ],
  },
  {
    id: "feature-cards",
    label: "Feature cards",
    description: "Three cards in a row",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          {
            type: "columns",
            props: { count: 3 },
            children: [
              {
                type: "card",
                props: { title: "Fast setup" },
                columnIndex: 0,
                children: [
                  {
                    type: "text",
                    props: { text: "Launch your site in minutes with drag-and-drop blocks." },
                  },
                ],
              },
              {
                type: "card",
                props: { title: "Flexible layout" },
                columnIndex: 1,
                children: [
                  {
                    type: "text",
                    props: { text: "Combine sections, columns, and cards however you like." },
                  },
                ],
              },
              {
                type: "card",
                props: { title: "Publish instantly" },
                columnIndex: 2,
                children: [
                  {
                    type: "text",
                    props: { text: "Preview changes live and publish when you are ready." },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "info-callout",
    label: "Info callout",
    description: "Highlighted notice box",
    blocks: [
      {
        type: "callout",
        props: {
          title: "Important",
          body: "Replace this with rules, announcements, or helpful tips for your community.",
          variant: "info",
        },
      },
    ],
  },
  {
    id: "page-header",
    label: "Page header",
    description: "Brand navigation and page title",
    blocks: [
      {
        type: "section",
        props: { padding: 16 },
        children: [
          { type: "nav", props: { style: "pills", text: "Your community" } },
          { type: "divider", props: { size: "sm", style: "line" } },
          { type: "heading", props: { text: "Home", level: 1 } },
        ],
      },
    ],
  },
  {
    id: "split-media",
    label: "Image and text",
    description: "Photo beside heading, copy, and button",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          {
            type: "columns",
            props: { count: 2 },
            children: [
              {
                type: "image",
                props: { url: "", alt: "Featured image", storageId: "", r2Key: "" },
                columnIndex: 0,
              },
              {
                type: "heading",
                props: { text: "A place for your members", level: 2 },
                columnIndex: 1,
              },
              {
                type: "text",
                props: {
                  text: "Share rules, cases, and updates in a layout that matches how your community already talks.",
                },
                columnIndex: 1,
              },
              {
                type: "button",
                props: { label: "Browse pages", href: "/", variant: "primary" },
                columnIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "stats-row",
    label: "Stats row",
    description: "Three highlight stats in cards",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          {
            type: "columns",
            props: { count: 3 },
            children: [
              {
                type: "card",
                props: { title: "" },
                columnIndex: 0,
                children: [
                  { type: "stat", props: { value: "12k+", label: "Members", hint: "People in the Discord." } },
                ],
              },
              {
                type: "card",
                props: { title: "" },
                columnIndex: 1,
                children: [
                  { type: "stat", props: { value: "340", label: "Cases", hint: "Resolved this month." } },
                ],
              },
              {
                type: "card",
                props: { title: "" },
                columnIndex: 2,
                children: [
                  { type: "stat", props: { value: "99.9%", label: "Uptime", hint: "Staff coverage this week." } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Heading with expandable questions",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "Frequently asked questions", level: 2 } },
          {
            type: "group",
            props: { gap: "sm" },
            children: [
              {
                type: "faq",
                props: {
                  question: "How do I join?",
                  answer: "Open Discord, accept the invite, and complete verification in #welcome.",
                },
              },
              {
                type: "faq",
                props: {
                  question: "How do I report someone?",
                  answer: "Open a ticket or use the report command. Staff will follow up in cases.",
                },
              },
              {
                type: "faq",
                props: {
                  question: "Where are the rules?",
                  answer: "Read the rules page before chatting in public channels.",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "community-rules",
    label: "Rules",
    description: "Numbered rules with a warning",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "Community rules", level: 2 } },
          {
            type: "text",
            props: { text: "Follow these so everyone can stay. Breaking them can lead to a mute, kick, or ban." },
          },
          {
            type: "list",
            props: {
              items: "Be respectful to members and staff.\nNo hate speech, harassment, or threats.\nKeep NSFW content out of public channels.\nDo not spam, raid, or share exploits.\nListen to staff — appeals go through cases.",
              ordered: true,
            },
          },
          {
            type: "callout",
            props: {
              title: "Appeals",
              body: "If you were actioned by mistake, open a case instead of arguing in chat.",
              variant: "warning",
            },
          },
        ],
      },
    ],
  },
  {
    id: "staff-team",
    label: "Staff team",
    description: "Three staff cards in a row",
    blocks: [
      {
        type: "section",
        props: { padding: 32, align: "center" },
        children: [
          { type: "heading", props: { text: "Staff", level: 2 } },
          {
            type: "text",
            props: { text: "Reach out to a team member if you need help." },
          },
          {
            type: "columns",
            props: { count: 3 },
            children: [
              {
                type: "card",
                props: { title: "" },
                columnIndex: 0,
                children: [
                  {
                    type: "image",
                    props: {
                      url: "https://api.dicebear.com/9.x/notionists/svg?seed=Alex",
                      alt: "Alex",
                      boxWidth: 80,
                      boxHeight: 80,
                      boxAlign: "center",
                    },
                  },
                  { type: "heading", props: { text: "Alex", level: 3 } },
                  { type: "badge", props: { text: "Owner", variant: "primary" } },
                  { type: "text", props: { text: "Runs the community and final appeals." } },
                ],
              },
              {
                type: "card",
                props: { title: "" },
                columnIndex: 1,
                children: [
                  {
                    type: "image",
                    props: {
                      url: "https://api.dicebear.com/9.x/notionists/svg?seed=Jordan",
                      alt: "Jordan",
                      boxWidth: 80,
                      boxHeight: 80,
                      boxAlign: "center",
                    },
                  },
                  { type: "heading", props: { text: "Jordan", level: 3 } },
                  { type: "badge", props: { text: "Admin", variant: "success" } },
                  { type: "text", props: { text: "Handles cases, roles, and server setup." } },
                ],
              },
              {
                type: "card",
                props: { title: "" },
                columnIndex: 2,
                children: [
                  {
                    type: "image",
                    props: {
                      url: "https://api.dicebear.com/9.x/notionists/svg?seed=Sam",
                      alt: "Sam",
                      boxWidth: 80,
                      boxHeight: 80,
                      boxAlign: "center",
                    },
                  },
                  { type: "heading", props: { text: "Sam", level: 3 } },
                  { type: "badge", props: { text: "Moderator", variant: "default" } },
                  { type: "text", props: { text: "Watches chat and keeps channels on-topic." } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "video-section",
    label: "Video",
    description: "Heading with an embedded video",
    blocks: [
      {
        type: "section",
        props: { padding: 32, align: "center" },
        children: [
          { type: "heading", props: { text: "Watch the intro", level: 2 } },
          {
            type: "text",
            props: { text: "Paste a YouTube or Vimeo URL in the embed settings." },
          },
          { type: "embed", props: { url: "", aspectRatio: "16:9" } },
        ],
      },
    ],
  },
  {
    id: "case-list",
    label: "Case list",
    description: "Heading with a case collection",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "Public cases", level: 2 } },
          {
            type: "text",
            props: { text: "Recent moderation cases from your Meridian bot." },
          },
          {
            type: "case_collection",
            props: {
              meridianBotId: "",
              scope: "guild",
              guildKey: "",
              typeFilter: "any",
              statusFilter: "any",
              emptyText: "No public cases yet.",
            },
          },
        ],
      },
    ],
  },
  {
    id: "join-community",
    label: "Join community",
    description: "Heading and invite button",
    blocks: [
      {
        type: "section",
        props: { padding: 48, align: "center" },
        children: [
          { type: "heading", props: { text: "Join the Discord", level: 2 } },
          {
            type: "text",
            props: { text: "New members start in #welcome. Verify, then pick your roles." },
          },
          { type: "button", props: { label: "Join Discord", href: "/", variant: "primary" } },
        ],
      },
    ],
  },
  {
    id: "bot-commands",
    label: "Bot commands",
    description: "Heading with a command snippet",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "Useful commands", level: 2 } },
          {
            type: "text",
            props: { text: "Run these in Discord. Replace placeholders before you publish." },
          },
          {
            type: "code",
            props: {
              language: "discord",
              content: "/report user:@member reason:spam\n/case view id:142\n/ticket open topic:appeal",
            },
          },
        ],
      },
    ],
  },
  {
    id: "testimonials-row",
    label: "Two testimonials",
    description: "Side-by-side quotes",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          {
            type: "columns",
            props: { count: 2 },
            children: [
              {
                type: "quote",
                props: {
                  text: "We finally have a public home for rules and cases.",
                  author: "Server owner",
                },
                columnIndex: 0,
              },
              {
                type: "quote",
                props: {
                  text: "Staff can update the site without waiting on a developer.",
                  author: "Moderator",
                },
                columnIndex: 1,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "announcement",
    label: "Announcement",
    description: "Success callout with a link",
    blocks: [
      {
        type: "section",
        props: { padding: 16 },
        children: [
          {
            type: "callout",
            props: {
              title: "Server update",
              body: "New channels are live this week. Check the changelog for role and case changes.",
              variant: "success",
            },
          },
          { type: "link", props: { label: "Read the changelog", href: "/", openInNewTab: false } },
        ],
      },
    ],
  },
  {
    id: "how-it-works",
    label: "How it works",
    description: "Three numbered steps",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "How it works", level: 2 } },
          {
            type: "columns",
            props: { count: 3 },
            children: [
              {
                type: "group",
                props: { gap: "sm" },
                columnIndex: 0,
                children: [
                  { type: "badge", props: { text: "01", variant: "default" } },
                  { type: "heading", props: { text: "Join", level: 3 } },
                  { type: "text", props: { text: "Accept the invite and complete verification." } },
                ],
              },
              {
                type: "group",
                props: { gap: "sm" },
                columnIndex: 1,
                children: [
                  { type: "badge", props: { text: "02", variant: "default" } },
                  { type: "heading", props: { text: "Read the rules", level: 3 } },
                  { type: "text", props: { text: "Know what is allowed before you post." } },
                ],
              },
              {
                type: "group",
                props: { gap: "sm" },
                columnIndex: 2,
                children: [
                  { type: "badge", props: { text: "03", variant: "default" } },
                  { type: "heading", props: { text: "Get involved", level: 3 } },
                  { type: "text", props: { text: "Pick roles, join channels, and talk with the community." } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "link-list",
    label: "Link list",
    description: "Heading with useful links",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "Quick links", level: 2 } },
          {
            type: "group",
            props: { gap: "sm" },
            children: [
              { type: "link", props: { label: "Rules", href: "/rules", openInNewTab: false } },
              { type: "link", props: { label: "Cases", href: "/cases", openInNewTab: false } },
              { type: "link", props: { label: "Staff", href: "/staff", openInNewTab: false } },
              { type: "link", props: { label: "Discord invite", href: "/", openInNewTab: true } },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "social-links",
    label: "Social links",
    description: "Heading with community links",
    blocks: [
      {
        type: "section",
        props: { padding: 32, align: "center" },
        children: [
          { type: "heading", props: { text: "Find us", level: 2 } },
          {
            type: "social",
            props: {
              items: "Discord | https://discord.gg/\nYouTube | https://youtube.com/\nTwitter | https://x.com/",
              style: "pills",
            },
          },
        ],
      },
    ],
  },
  {
    id: "activity-graph",
    label: "Activity graph",
    description: "Heading with a line chart",
    blocks: [
      {
        type: "section",
        props: { padding: 32 },
        children: [
          { type: "heading", props: { text: "This week", level: 2 } },
          {
            type: "graph",
            props: {
              title: "Messages",
              kind: "line",
              items: "Mon | 12\nTue | 19\nWed | 14\nThu | 22\nFri | 18\nSat | 9\nSun | 11",
            },
          },
        ],
      },
    ],
  },
  {
    id: "site-footer",
    label: "Site footer",
    description: "Closing copyright line",
    blocks: [
      {
        type: "section",
        props: { padding: 32, align: "center" },
        children: [
          { type: "footer", props: { text: "© Your community. All rights reserved." } },
        ],
      },
    ],
  },
];
