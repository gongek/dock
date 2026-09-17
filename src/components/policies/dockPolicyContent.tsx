import Link from "next/link";
import PolicyLicensesClient from "@/components/policies/PolicyLicensesClient";
import PolicySubprocessorsTable from "@/components/policies/PolicySubprocessorsTable";
import { sectionsDocument } from "@/components/policies/PolicySectionsDocument";
import type { PolicySectionDef } from "@/components/policies/PolicySectionsDocument";
import { legalPath } from "@/lib/policies/legalPath";
import packageLicenses from "@/lib/generated/packageLicenses.json";
import {
  DOCK_DOMAIN,
  DOCK_OPERATOR_DISCLOSURE,
  DOCK_SUBPROCESSORS,
  DOCK_TRADE_NAME,
  LEGAL_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_OWNER_NAME,
  LEGAL_VENUE,
  MERIDIAN_DOMAIN,
  MERIDIAN_TRADE_NAME,
  SECURITY_EMAIL,
} from "@/lib/policiesConstants";

const listStyle: React.CSSProperties = {
  marginTop: "12px",
  paddingLeft: "24px",
  listStyleType: "disc",
};

const policyLink = (slug: string, hash?: string) =>
  hash ? `${legalPath(slug)}#${hash}` : legalPath(slug);

function stripSectionTitleNumber(title: string): string {
  return title.replace(/^\d+\.\s*/, "");
}

function renumberSectionTitle(title: string, sectionNumber: number): string {
  return `${sectionNumber}. ${stripSectionTitleNumber(title)}`;
}

const AUP_SECTION_ID_PREFIX = "aup-";

function mergeAcceptableUseIntoTerms(
  coreSections: readonly PolicySectionDef[],
  acceptableUseSections: readonly PolicySectionDef[],
): PolicySectionDef[] {
  const reservedIds = new Set(coreSections.map((section) => section.id));
  const contactSection = acceptableUseSections.find((section) => section.id === "aup-contact");
  const aupSections = acceptableUseSections.filter((section) => section.id !== "aup-contact");

  const renumberedAup = aupSections.map((section, index) => {
    const sectionNumber = coreSections.length + index + 1;
    const id = reservedIds.has(section.id) ? `${AUP_SECTION_ID_PREFIX}${section.id}` : section.id;

    let content = section.content;
    if (section.id === "aup-scope") {
      content = (
        <>
          <p>
            This Acceptable Use Policy applies to everyone who uses {DOCK_TRADE_NAME}, including site
            operators, collaborators, staff, and site visitors. It describes behavioral expectations,
            prohibited uses, and consequences of violations.
          </p>
          <p style={{ marginTop: "12px" }}>
            If this section conflicts with other parts of these Terms on acceptable use, this section
            controls for that subject matter.
          </p>
        </>
      );
    }

    return {
      ...section,
      id,
      title: renumberSectionTitle(section.title, sectionNumber),
      content,
    };
  });

  const contactNumber = coreSections.length + renumberedAup.length + 1;
  const contact: PolicySectionDef = {
    id: "contact",
    title: `${contactNumber}. Contact`,
    content: (
      <p>
        Questions about these Terms or acceptable use: {LEGAL_EMAIL} or our official support
        channels.
      </p>
    ),
  };

  if (!contactSection) {
    return [...coreSections, ...renumberedAup];
  }

  return [...coreSections, ...renumberedAup, contact];
}

const TERMS_OF_SERVICE_CORE_SECTIONS: PolicySectionDef[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    content: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of{" "}
          {DOCK_TRADE_NAME} ({DOCK_DOMAIN}), a visual site builder for {MERIDIAN_TRADE_NAME}{" "}
          Discord bots. {DOCK_TRADE_NAME} is a trade name of {LEGAL_OWNER_NAME} (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;), registered with the Dutch Chamber of Commerce (KvK)
          under number 42127201.
        </p>
        <p style={{ marginTop: "12px" }}>
          By accessing or using the Service, you agree to these Terms and to our other policies
          linked from the{" "}
          <Link href={legalPath()} className="text-zinc-200 underline underline-offset-2">
            legal center
          </Link>
          . If you do not agree, do not use the Service.
        </p>
        <p style={{ marginTop: "12px" }}>
          Capitalized terms used in these Terms have the meanings given in Section 2 (Definitions).
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "2. Definitions",
    content: (
      <>
        <p>In these Terms:</p>
        <ul style={listStyle}>
          <li>
            <strong>Terms</strong> means these Terms of Service.
          </li>
          <li>
            <strong>Service</strong> means the {DOCK_TRADE_NAME} platform at {DOCK_DOMAIN},
            including the site builder, hosting, and related features we provide.
          </li>
          <li>
            <strong>We, us, or our</strong> means {LEGAL_OWNER_NAME}, which operates{" "}
            {DOCK_TRADE_NAME} as a trade name.
          </li>
          <li>
            <strong>You</strong> means the individual or organization accessing or using the
            Service.
          </li>
          <li>
            <strong>Site operator</strong> means a {DOCK_TRADE_NAME} account holder who creates,
            configures, publishes, or manages sites. Site operators are responsible for the content
            and settings on their sites.
          </li>
          <li>
            <strong>Collaborators and staff</strong> means people you authorize to access published
            sites or help manage your sites through access controls you configure.
          </li>
          <li>
            <strong>Sites</strong> or <strong>published sites</strong> means pages and related
            content you build and make available through {DOCK_TRADE_NAME}, including on default or
            custom domains.
          </li>
          <li>
            <strong>Site visitors</strong> means people who access your published sites, including
            when signing in to view protected pages.
          </li>
          <li>
            <strong>{MERIDIAN_TRADE_NAME}</strong> means the related product at {MERIDIAN_DOMAIN}{" "}
            used to link bots, sync data from those bots, and support billing and feature access as
            described in these Terms.
          </li>
          <li>
            <strong>Bot data</strong> means information synced from your linked {MERIDIAN_TRADE_NAME}{" "}
            bot that you choose to display on your sites.
          </li>
          <li>
            <strong>Content</strong> means text, images, embeds, bot data, and other material you
            upload, configure, or publish through the Service.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. Accounts and security",
    content: (
      <>
        <p>
          You need an account to create and manage sites. Site collaborators and staff may access
          published sites through access controls you configure.
        </p>
        <p style={{ marginTop: "12px" }}>
          You are responsible for all activity under your account and for keeping access credentials
          secure. Should you suspect unauthorized access to your account, please reach out as soon
          as possible so we can reach a solution together. We are not liable for losses caused by
          your failure to protect your account.
        </p>
      </>
    ),
  },
  {
    id: "meridian",
    title: "4. Meridian integration",
    content: (
      <>
        <p>
          {DOCK_TRADE_NAME} connects to {MERIDIAN_TRADE_NAME} ({MERIDIAN_DOMAIN}) to link bots,
          sync bot data, and support billing and feature access. Your use of{" "}
          {MERIDIAN_TRADE_NAME} is also subject to {MERIDIAN_TRADE_NAME}'s own terms and
          policies.
        </p>
        <p style={{ marginTop: "12px" }}>
          {DOCK_TRADE_NAME} and {MERIDIAN_TRADE_NAME} may be offered separately or together. We may
          change how the products work together, including bundled offers, discounts, and what{" "}
          {MERIDIAN_TRADE_NAME} subscriptions include, at any time. We may also change{" "}
          {DOCK_TRADE_NAME} pricing, plans, limits, and features at any time, with notice when
          required by applicable law. Nothing on our site or in these Terms guarantees that a
          particular price, bundle, or entitlement will continue.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "5. Third-party platforms",
    content: (
      <p>
        {DOCK_TRADE_NAME} depends on third-party services. Your use of those services through{" "}
        {DOCK_TRADE_NAME} is subject to their own terms and policies. We may take action on{" "}
        {DOCK_TRADE_NAME} when permitted by law and these Terms, including suspension or
        termination for violations described in later sections.
      </p>
    ),
  },
  {
    id: "published-sites",
    title: "6. Published sites and custom domains",
    content: (
      <>
        <p>
          You are responsible for all content you publish through {DOCK_TRADE_NAME}. You must have
          the rights and lawful basis to publish that content.
        </p>
        <p style={{ marginTop: "12px" }}>
          Custom domains, where available on your plan, require DNS configuration and verification.
          SSL certificates for custom hostnames are provisioned through our infrastructure
          partners. You are responsible for maintaining valid DNS records and complying with
          requirements of your domain registrar.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "7. Intellectual property and DMCA",
    content: (
      <>
        <p>
          {DOCK_TRADE_NAME} and its original content, features, and underlying software are owned
          by {LEGAL_OWNER_NAME}. You retain ownership of the sites and content you create. You grant
          us a non-exclusive, worldwide, royalty-free license to host, store, back up, display, and
          distribute your site content as needed to provide the Service.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong>Copyright complaints (DMCA).</strong> If you believe content hosted on{" "}
          {DOCK_TRADE_NAME} infringes your copyright, send a written notice to {LEGAL_EMAIL}. To
          help us process your claim, include:
        </p>
        <ul style={listStyle}>
          <li>
            Your physical or electronic signature, and identification of yourself or the person
            authorized to act on the copyright owner's behalf.
          </li>
          <li>
            Identification of the copyrighted work you claim has been infringed, or if multiple works
            are covered, a representative list.
          </li>
          <li>
            Identification of the material you claim is infringing, with enough detail for us to
            locate it (for example, the site URL and a description of where the content appears).
          </li>
          <li>
            Your contact information, including address, telephone number, and email address.
          </li>
          <li>
            A statement that you have a good-faith belief that use of the material is not authorized
            by the copyright owner, its agent, or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information in your notice is accurate
            and that you are the copyright owner or authorized to act on the owner's behalf.
          </li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          We may forward your notice to the site operator who published the content and may remove
          or disable access to material we reasonably believe infringes copyright. If you believe
          your content was removed in error, you may send a counter-notification to {LEGAL_EMAIL}{" "}
          with the information required by applicable law, including your consent to the
          jurisdiction of the relevant courts.
        </p>
        <p style={{ marginTop: "12px" }}>
          Misrepresenting that material infringes copyright may have legal consequences. Submit
          notices only in good faith.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "8. Fees, billing, and refunds",
    content: (
      <>
        <p>
          Some features require payment. We may change prices, plans, limits, and what is included at
          any time, with notice when required by applicable law. You may not circumvent plan limits,
          usage restrictions, or other paid-feature controls through automation, abuse, technical
          workarounds, or any other means.
        </p>
        <p style={{ marginTop: "12px" }}>
          Paid {DOCK_TRADE_NAME} subscriptions are processed through your {MERIDIAN_TRADE_NAME}{" "}
          account on {MERIDIAN_DOMAIN}. Payment is completed through {MERIDIAN_TRADE_NAME}&apos;s
          checkout flow, but {DOCK_TRADE_NAME} is the contracting party for your subscription.
        </p>
        <ul className="policy-list-compact">
          <li>
            <span>
              <strong>Refunds:</strong> Payments are non-refundable except where required by law. We
              allocate hosting resources when you subscribe, so we do not offer prorated refunds for
              partial billing periods if you cancel early.
            </span>
          </li>
          <li>
            <span>
              <strong>Cancellation:</strong> You may cancel through {DOCK_TRADE_NAME}. Paid access
              continues until the end of the current billing period.
            </span>
          </li>
          <li>
            <span>
              <strong>Non-payment:</strong> If payment fails or your subscription lapses, we may
              suspend paid features after a reasonable grace period.
            </span>
          </li>
          <li>
            <span>
              <strong>Chargebacks:</strong> Opening a payment dispute without contacting support first
              may result in immediate and permanent account suspension.
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "data",
    title: "9. Hosted content and data",
    content: (
      <>
        <p>
          You are responsible for backups of content you publish. {DOCK_TRADE_NAME} is not liable
          for data loss from outages, account termination, or other events.
        </p>
        <p style={{ marginTop: "12px" }}>
          When you display bot data on your {DOCK_TRADE_NAME} sites, you are the data controller
          for that information. {LEGAL_OWNER_NAME} acts as a processor hosting that data on your
          instructions. See our{" "}
          <Link href={policyLink("privacy")} className="text-zinc-200 underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href={policyLink("dpa")} className="text-zinc-200 underline underline-offset-2">
            Data Processing Agreement
          </Link>
          .
        </p>
        <p style={{ marginTop: "12px" }}>
          We may remove content that violates these Terms, our other policies, applicable law, or
          third-party platform rules.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "10. Disclaimer of warranties",
    content:
      'The Service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted, secure, or error-free operation.',
  },
  {
    id: "limitation",
    title: "11. Limitation of liability",
    content: `To the fullest extent permitted by ${LEGAL_JURISDICTION} law, ${LEGAL_OWNER_NAME} is not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill, arising from your use of the Service.`,
  },
  {
    id: "indemnification",
    title: "12. Indemnification",
    content: `You agree to defend, indemnify, and hold harmless ${LEGAL_OWNER_NAME} from claims, damages, and costs (including reasonable legal fees) arising from your use of the Service, your published sites, or your breach of these Terms or third-party platform policies.`,
  },
  {
    id: "termination",
    title: "13. Termination",
    content:
      "We may suspend or terminate your access immediately if you breach these Terms or if required to protect users, the Service, or third parties. You may request account deletion by contacting us. After termination for abuse, we may retain data as described in our Privacy Policy.",
  },
  {
    id: "law",
    title: "14. Governing law",
    content: `These Terms are governed by the laws of ${LEGAL_JURISDICTION}, without regard to conflict-of-law rules. Disputes shall be submitted to ${LEGAL_VENUE}, unless mandatory consumer law in your country requires otherwise.`,
  },
];

const ACCEPTABLE_USE_POLICY_SECTIONS: PolicySectionDef[] = [
  {
    id: "aup-scope",
    title: "1. Scope",
    content: (
      <>
        <p>
          This Acceptable Use Policy (&quot;AUP&quot;) applies to everyone who uses {DOCK_TRADE_NAME},
          including site owners, collaborators, staff, and visitors who interact with published
          sites. It describes behavioral expectations, prohibited uses, and consequences of
          violations.
        </p>
        <p style={{ marginTop: "12px" }}>
          This AUP is incorporated into our{" "}
          <Link href={policyLink("terms")} className="text-zinc-200 underline underline-offset-2">
            Terms of Service
          </Link>
          . If this AUP conflicts with the Terms on acceptable use, this AUP controls for that
          subject matter.
        </p>
      </>
    ),
  },
  {
    id: "aup-discord",
    title: "2. Discord compliance",
    content: (
      <>
        <p>
          {DOCK_TRADE_NAME} depends on the Discord API. You are responsible for how your sites use
          Discord data and for compliance with Discord&apos;s{" "}
          <a
            href="https://discord.com/terms"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-200 underline underline-offset-2"
          >
            Terms of Service
          </a>
          ,{" "}
          <a
            href="https://discord.com/developers/docs/policies/terms-and-conditions"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-200 underline underline-offset-2"
          >
            Developer Terms of Service
          </a>
          , and{" "}
          <a
            href="https://discord.com/guidelines"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-200 underline underline-offset-2"
          >
            Community Guidelines
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "aup-data",
    title: "3. Data and privacy",
    content: (
      <>
        <p>Site operators must respect user data when publishing sites:</p>
        <ul style={listStyle}>
          <li>Display only bot data you are authorized to publish.</li>
          <li>Do not expose private member lists, messages, or profiles for unrelated purposes.</li>
          <li>Do not sell or share private user data without clear consent.</li>
          <li>
            Tell server members what your site displays and stores when required by law or Discord
            rules.
          </li>
          <li>
            Configure access controls appropriately so sensitive information is not publicly
            accessible.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "aup-conduct",
    title: "4. Conduct and respect",
    content: (
      <>
        <p>You must not use {DOCK_TRADE_NAME} to:</p>
        <ul style={listStyle}>
          <li>Harass, bully, or target individuals or groups.</li>
          <li>Impersonate {DOCK_TRADE_NAME}, {MERIDIAN_TRADE_NAME}, Discord, staff, or other users.</li>
          <li>Publish misleading or deceptive content on published sites.</li>
          <li>Use sites to circumvent server rules or evade enforcement actions at scale.</li>
        </ul>
      </>
    ),
  },
  {
    id: "aup-content",
    title: "5. Prohibited content and activities",
    content: (
      <>
        <p>You may not use {DOCK_TRADE_NAME} to create, host, or distribute content or services that:</p>
        <ul style={listStyle}>
          <li>Violate applicable law or promote illegal activity.</li>
          <li>
            Contain or distribute malware, phishing pages, credential harvesters, or other deceptive
            software.
          </li>
          <li>
            Include sexually explicit material involving minors, non-consensual imagery, or
            exploitation.
          </li>
          <li>Promote violence, terrorism, or credible threats against people or groups.</li>
          <li>
            Constitute hate speech, harassment, bullying, or targeted abuse based on protected
            characteristics.
          </li>
          <li>
            Infringe intellectual property, privacy, or publicity rights of others without
            permission.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "aup-security",
    title: "6. Security and platform integrity",
    content: (
      <>
        <p>You must not:</p>
        <ul style={listStyle}>
          <li>
            Attempt unauthorized access to {DOCK_TRADE_NAME} systems, other users' accounts, or
            site data.
          </li>
          <li>Probe, scan, or attack our infrastructure without written authorization.</li>
          <li>
            Share session tokens, OAuth tokens, or credentials in public channels or published
            pages.
          </li>
          <li>
            Reverse engineer or extract source code from {DOCK_TRADE_NAME} except where law
            expressly permits it.
          </li>
          <li>Create duplicate accounts to evade limits or bans.</li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Report security issues through our{" "}
          <Link
            href={policyLink("privacy", "security")}
            className="text-zinc-200 underline underline-offset-2"
          >
            Privacy Policy (Security section)
          </Link>
          . Do not exploit vulnerabilities beyond what is needed for a good-faith report.
        </p>
      </>
    ),
  },
  {
    id: "aup-fair-use",
    title: "7. Fair use",
    content: (
      <>
        <p>
          Shared hosting resources are subject to fair use limits described in our{" "}
          <Link href={policyLink("fair-use")} className="text-zinc-200 underline underline-offset-2">
            Fair Use Policy
          </Link>
          . Sustained abuse of storage, bandwidth, or API limits may result in throttling or
          suspension.
        </p>
      </>
    ),
  },
  {
    id: "aup-enforcement",
    title: "8. Enforcement",
    content:
      "We may warn, restrict, suspend, or terminate access for violations. We may remove published content without notice when required to address abuse, legal obligations, or third-party complaints.",
  },
  {
    id: "aup-contact",
    title: "9. Contact",
    content: `Questions about acceptable use: ${LEGAL_EMAIL} or our official support channels.`,
  },
];

export const TermsOfServiceContent = sectionsDocument(
  mergeAcceptableUseIntoTerms(TERMS_OF_SERVICE_CORE_SECTIONS, ACCEPTABLE_USE_POLICY_SECTIONS),
);

export const PrivacyPolicyContent = sectionsDocument([
  {
    id: "intro",
    title: "1. Introduction",
    content: (
      <>
        <p>
          {DOCK_TRADE_NAME} ({DOCK_DOMAIN}) is a trade name of {LEGAL_OWNER_NAME} (&quot;we&quot;,
          &quot;us&quot;, or &quot;our&quot;). This Privacy Policy explains how we collect, use,
          store, and share personal data when you use {DOCK_TRADE_NAME}.
        </p>
        <p style={{ marginTop: "12px" }}>{DOCK_OPERATOR_DISCLOSURE}</p>
      </>
    ),
  },
  {
    id: "collect",
    title: "2. Information we collect",
    content: (
      <>
        <p>We collect information needed to run {DOCK_TRADE_NAME}, including:</p>
        <ul style={listStyle}>
          <li>
            <strong>Account data:</strong> display name, email (when provided through linked
            sign-in), avatar, Discord user ID, {MERIDIAN_TRADE_NAME} user ID, and plan entitlements.
          </li>
          <li>
            <strong>Linked sign-in data:</strong> when you connect {MERIDIAN_TRADE_NAME} or Discord,
            we receive profile fields those providers share with us under the permissions you
            grant.
          </li>
          <li>
            <strong>Site builder data:</strong> page layouts, block content, themes, navbar
            settings, access rules, custom domain configuration, and uploaded media.
          </li>
          <li>
            <strong>Bot data:</strong> information synced from your linked {MERIDIAN_TRADE_NAME} bot
            that you choose to display on your sites, such as user identifiers, reasons, evidence
            URLs, durations, and related metadata.
          </li>
          <li>
            <strong>Published-site visitor data:</strong> when visitors sign in with Discord to
            access protected pages, we may receive profile fields and guild membership or role
            information needed to enforce your access settings.
          </li>
          <li>
            <strong>Payment data:</strong> subscription and billing metadata processed through your{" "}
            {MERIDIAN_TRADE_NAME} account and Stripe. We do not store full card numbers.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "roles",
    title: "3. Controller and processor roles",
    content: (
      <>
        <p>
          For your {DOCK_TRADE_NAME} account and platform operation, {LEGAL_OWNER_NAME} is the data
          controller.
        </p>
        <p style={{ marginTop: "12px" }}>
          When you publish bot data or other information on your sites, <strong>you</strong> are the
          controller for that information and {LEGAL_OWNER_NAME} acts as a processor hosting and
          displaying it on your instructions. You must provide any notices and obtain any consents
          required by law. See our{" "}
          <Link href={policyLink("dpa")} className="text-zinc-200 underline underline-offset-2">
            Data Processing Agreement
          </Link>
          .
        </p>
        <p style={{ marginTop: "12px" }}>
          {MERIDIAN_TRADE_NAME} is a separate product with its own privacy practices. Data processed
          solely within {MERIDIAN_TRADE_NAME} is governed by {MERIDIAN_TRADE_NAME}'s privacy
          policy at {MERIDIAN_DOMAIN}.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "4. How we use information",
    content: (
      <>
        <p>We use personal data to:</p>
        <ul style={listStyle}>
          <li>Provide, host, and secure {DOCK_TRADE_NAME}.</li>
          <li>Authenticate users and enforce page access controls.</li>
          <li>Sync and display bot data from linked bots.</li>
          <li>Process subscriptions and plan entitlements.</li>
          <li>Provision custom domains and SSL certificates.</li>
          <li>Detect abuse, fraud, and technical issues.</li>
          <li>Comply with law and enforce our policies.</li>
        </ul>
        <p style={{ marginTop: "12px" }}>We do not sell personal data.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "5. Sharing and disclosure",
    content: (
      <>
        <p>We share data only when needed to operate {DOCK_TRADE_NAME}:</p>
        <ul style={listStyle}>
          <li>
            <strong>Subprocessors</strong> listed in section 6 who host or process data for us.
          </li>
          <li>
            <strong>Discord and {MERIDIAN_TRADE_NAME}</strong> when you connect those accounts or
            when your sites verify guild access.
          </li>
          <li>
            <strong>Legal requests</strong> when required by law or to protect rights and safety.
          </li>
          <li>
            <strong>Business transfers</strong> in a merger, acquisition, or asset sale, with notice
            where required.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "subprocessors",
    title: "6. Subprocessors",
    content: (
      <>
        <p>
          We use the following subprocessors to deliver {DOCK_TRADE_NAME}. Each processes only the
          data needed for its role:
        </p>
        <PolicySubprocessorsTable subprocessors={DOCK_SUBPROCESSORS} />
        <p style={{ marginTop: "16px" }}>
          We may update this list as our infrastructure changes. Material changes will be
          communicated according to our Terms of Service.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "7. International transfers",
    content: (
      <p>
        We are based in the European Union. Some subprocessors process data in the United States or
        other countries. Where required, we rely on appropriate safeguards such as Standard
        Contractual Clauses approved by the European Commission for transfers from the EEA/UK.
      </p>
    ),
  },
  {
    id: "retention",
    title: "8. Data retention",
    content: (
      <>
        <p>
          We keep account and site data while your account is active and as needed to provide the
          Service. When you request deletion, we delete personal data within a reasonable period,
          unless a longer period is required by law.
        </p>
        <p style={{ marginTop: "12px" }}>
          If we terminate your account for abuse or legal reasons, we may retain relevant data for
          investigations, dispute resolution, or legal hold.
        </p>
        <p style={{ marginTop: "12px" }}>
          Temporary signup and OAuth state data expires automatically on shorter schedules.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "9. Security and vulnerability reports",
    content: (
      <>
        <p>
          We use technical and organizational measures to protect data. No method of transmission or
          storage is completely secure.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong>Reporting bugs.</strong> Sensitive issues (authentication, sessions, unauthorized
          access to site data, or exposure of private user information) should be reported to us
          directly. Do not post exploit steps, tokens, or customer data in public channels.
        </p>
        <p style={{ marginTop: "12px" }}>
          Do not run bulk scans, credential stuffing, or denial-of-service tests against production.
          If you accidentally access data you should not have, stop and report it.
        </p>
        <p style={{ marginTop: "12px" }}>
          Contact: {SECURITY_EMAIL}. Qualifying security reports may receive a bounty or account
          credit at our discretion. Nothing here is a binding offer.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "10. Cookies and similar technologies",
    content: (
      <>
        <p>
          {LEGAL_OWNER_NAME} uses cookies and similar technologies on {DOCK_TRADE_NAME} (
          {DOCK_DOMAIN}) and published sites to operate the Service and keep you signed in.
        </p>
        <p style={{ marginTop: "12px" }}>
          Cookies are small text files stored on your device.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong>Strictly necessary cookies.</strong> These are required for {DOCK_TRADE_NAME} to
          work:
        </p>
        <ul style={listStyle}>
          <li>Session cookies that keep you signed in to the {DOCK_TRADE_NAME} dashboard.</li>
          <li>OAuth redirect cookies that route you back to the correct page after sign-in.</li>
          <li>
            Published-site cookies that store Discord identity and access tokens for page access
            checks.
          </li>
        </ul>
        <p style={{ marginTop: "12px" }}>
          Blocking these cookies may prevent you from signing in or accessing protected pages.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong>Analytics.</strong> {DOCK_TRADE_NAME} does not use third-party advertising or
          analytics cookies. We do not sell cookie data.
        </p>
        <p style={{ marginTop: "12px" }}>
          <strong>Your choices.</strong> Most browsers let you block or delete cookies. Essential
          cookies are required for core features.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "11. Your rights and choices",
    content: (
      <>
        <p>
          Depending on where you live (including the EEA, UK, and California), you may have rights
          to access, correct, delete, restrict, or port your personal data, and to object to or
          withdraw consent for certain processing.
        </p>
        <p style={{ marginTop: "12px" }}>You can:</p>
        <ul style={listStyle}>
          <li>Contact us at {LEGAL_EMAIL} to request access, correction, or deletion.</li>
          <li>Object to processing where applicable law gives you that right.</li>
          <li>Lodge a complaint with your local supervisory authority.</li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party",
    title: "12. Third-party embeds and services",
    content: (
      <p>
        Site operators may embed third-party content in pages they build. Those services may collect
        data under their own policies when a visitor interacts with an embed. Review their privacy
        terms before adding embeds to your site.
      </p>
    ),
  },
  {
    id: "children",
    title: "13. Children's privacy",
    content: `${DOCK_TRADE_NAME} is not directed at children under 13. We do not knowingly collect personal data from anyone under 13. If you believe a child provided us data, contact us and we will delete it.`,
  },
  {
    id: "changes",
    title: "14. Changes to this policy",
    content:
      "We may update this Privacy Policy from time to time. We will post the new version on this page and update the last updated date. Continued use after changes means you accept the updated policy where permitted by law.",
  },
  {
    id: "contact",
    title: "15. Contact",
    content: `Privacy questions: ${LEGAL_EMAIL} or our official support channels.`,
  },
]);

export const DpaContent = sectionsDocument([
  {
    id: "parties",
    title: "1. Parties and scope",
    content: (
      <>
        <p>
          This Data Processing Agreement (&quot;DPA&quot;) forms part of the agreement between you
          (&quot;Controller&quot;) and {LEGAL_OWNER_NAME} (&quot;Processor&quot;) when you use{" "}
          {DOCK_TRADE_NAME} to publish sites that process personal data about Discord users or
          other visitors on your behalf.
        </p>
        <p style={{ marginTop: "12px" }}>
          This DPA applies where GDPR, UK GDPR, or similar laws require a written processing
          agreement.
        </p>
      </>
    ),
  },
  {
    id: "subject",
    title: "2. Subject matter and duration",
    content: `Processor hosts your site configurations, published pages, bot data, uploaded media, and related metadata for the duration of your account and subscription, plus retention periods in our Privacy Policy.`,
  },
  {
    id: "nature",
    title: "3. Nature and purpose of processing",
    content:
      "Processing includes storage, hosting, display, backup, transmission to Discord for access verification, and support activities necessary to operate your published sites on Dock.",
  },
  {
    id: "data",
    title: "4. Categories of data and subjects",
    content:
      "Data subjects may include your staff, collaborators, and people who visit or are referenced on your sites. Categories may include identifiers (such as Discord user IDs), usernames, avatars, guild membership, roles, bot data fields, and other information you configure your sites to display.",
  },
  {
    id: "obligations",
    title: "5. Processor obligations",
    content: (
      <>
        <p>Processor will:</p>
        <ul style={listStyle}>
          <li>Process personal data only on documented instructions from Controller.</li>
          <li>Ensure personnel with access are bound by confidentiality.</li>
          <li>Implement appropriate technical and organizational security measures.</li>
          <li>Assist Controller with data subject requests where feasible.</li>
          <li>Notify Controller without undue delay of personal data breaches we discover.</li>
          <li>Delete or return data when the service ends, subject to legal retention.</li>
        </ul>
      </>
    ),
  },
  {
    id: "subprocessors",
    title: "6. Subprocessors",
    content: (
      <>
        <p>
          Controller authorizes Processor to use subprocessors listed below. Processor remains
          responsible for their performance:
        </p>
        <PolicySubprocessorsTable subprocessors={DOCK_SUBPROCESSORS} />
      </>
    ),
  },
  {
    id: "transfers",
    title: "7. International transfers",
    content: `Where personal data is transferred outside the EEA/UK, Processor uses appropriate safeguards such as Standard Contractual Clauses under ${LEGAL_JURISDICTION} and EU law.`,
  },
  {
    id: "contact",
    title: "8. Contact",
    content: (
      <>
        DPA inquiries: {LEGAL_EMAIL}. See also our{" "}
        <Link href={policyLink("privacy")} className="text-zinc-200 underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
]);

export const FairUseContent = sectionsDocument([
  {
    id: "scope",
    title: "1. Scope",
    content: (
      <>
        <p>
          This Fair Use Policy applies to all {DOCK_TRADE_NAME} users. {DOCK_TRADE_NAME} provides
          shared hosting for published sites. Fair use exists so every user receives consistent
          performance and no single site degrades stability for others.
        </p>
        <p style={{ marginTop: "12px" }}>
          This policy supplements our{" "}
          <Link href={policyLink("terms")} className="text-zinc-200 underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "plans",
    title: "2. Plan limits",
    content: (
      <>
        <p>
          Each plan includes usage limits described on our{" "}
          <Link href="/premium" className="text-zinc-200 underline underline-offset-2">
            pricing page
          </Link>
          . Bypassing those limits by creating duplicate accounts or using undocumented methods is
          prohibited.
        </p>
      </>
    ),
  },
  {
    id: "media",
    title: "3. Media and storage",
    content:
      "Uploaded images and files are intended for site content. Using Dock as bulk file hosting, a public CDN for unrelated assets, or backup storage is outside fair use. We may impose size or count limits.",
  },
  {
    id: "traffic",
    title: "4. Traffic and bandwidth",
    content:
      "Published sites receive generous bandwidth for normal community use. Sustained high traffic that resembles a denial-of-service pattern, hotlinking abuse, or using Dock to serve large downloads unrelated to your site may result in throttling or suspension.",
  },
  {
    id: "domains",
    title: "5. Custom domains",
    content: (
      <>
        Custom domains, where available on your plan, are for your community sites. Using custom
        domains to host unrelated commercial content, phishing pages, or content that violates our
        Terms is prohibited. Domain limits are described on our{" "}
        <Link href="/premium" className="text-zinc-200 underline underline-offset-2">
          pricing page
        </Link>
        .
      </>
    ),
  },
  {
    id: "enforcement",
    title: "6. Enforcement",
    content:
      "We may throttle, restrict, or suspend sites that exceed fair use. Repeated or severe abuse may result in account termination.",
  },
]);

export const LicensesContent = function LicensesContent() {
  return (
    <PolicyLicensesClient sections={packageLicenses.sections} />
  );
};
