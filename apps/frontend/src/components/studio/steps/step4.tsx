'use client';

import React, { useEffect, useMemo, useState } from "react";
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Button, Divider, IconButton, Stack, Typography, Paper, TextField,
  Switch, Chip, Fade, InputAdornment,
  CircularProgress, Tooltip, Link
} from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useRouter, useSearchParams } from "next/navigation";

// Icons
import ArrowBackIcon from "@mui/icons-material/KeyboardArrowLeft";
import ArrowForwardIcon from "@mui/icons-material/KeyboardArrowRight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import StorageIcon from '@mui/icons-material/Storage';
import WebhookIcon from '@mui/icons-material/Webhook';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

/* ------------------ Types ------------------ */
type IntegrationCategory = "Payments" | "Auth" | "Communication" | "Storage" | "Data" | "Analytics" | "Webhooks";

type IntegrationDef = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  docsUrl?: string;
  fields: Array<{ 
    key: string; 
    label: string; 
    type: "text" | "password"; 
    placeholder?: string;
    hint?: string;
    validate?: (val: string) => string | null;
  }>;
};

type IntegrationConfig = {
  enabled: boolean;
  environment: "dev" | "prod";
  credentials: Record<string, string>;
  settings?: Record<string, any>;
};

const DEFAULT_CONFIG: IntegrationConfig = {
  enabled: false,
  environment: 'dev',
  credentials: {}
};

/* ------------------ 1. EXTENDED CATALOG (5+ Per Category) ------------------ */
const CATALOG: IntegrationDef[] = [
  // --- PAYMENTS ---
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "The standard for online payments and subscriptions.",
    docsUrl: "https://stripe.com/docs",
    fields: [
      { key: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_test_...", validate: v => !v.startsWith('pk_') ? 'Must start with pk_' : null },
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_test_...", validate: v => !v.startsWith('sk_') ? 'Must start with sk_' : null },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_..." },
    ]
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "Payments",
    description: "Accept PayPal, Venmo, and Pay Later options.",
    fields: [
      { key: "clientId", label: "Client ID", type: "text" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
      { key: "webhookId", label: "Webhook ID", type: "text" },
    ]
  },
  {
    id: "coinbase",
    name: "Coinbase Commerce",
    category: "Payments",
    description: "Accept crypto payments directly to your wallet.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "webhookSecret", label: "Webhook Shared Secret", type: "password" },
    ]
  },
  {
    id: "lemonsqueezy",
    name: "Lemon Squeezy",
    category: "Payments",
    description: "Merchant of record for SaaS tax compliance.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "storeId", label: "Store ID", type: "text" },
      { key: "webhookSecret", label: "Signing Secret", type: "password" },
    ]
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "Payment gateway solution for India.",
    fields: [
      { key: "keyId", label: "Key ID", type: "text", placeholder: "rzp_test_..." },
      { key: "keySecret", label: "Key Secret", type: "password" },
    ]
  },

  // --- AUTHENTICATION ---
  {
    id: "clerk",
    name: "Clerk",
    category: "Auth",
    description: "Complete user management UIs and APIs.",
    fields: [
      { key: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_..." },
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_..." },
    ]
  },
  {
    id: "privy",
    name: "Privy",
    category: "Auth",
    description: "Onboard users to Web3 with embedded wallets.",
    docsUrl: "https://docs.privy.io",
    fields: [
      { key: "appId", label: "App ID", type: "text" },
      { key: "appSecret", label: "App Secret", type: "password" },
      { key: "verificationKey", label: "Verification Key", type: "text", hint: "Public key for JWT verification" },
    ]
  },
  {
    id: "dynamic",
    name: "Dynamic",
    category: "Auth",
    description: "Multi-chain wallet authentication adapter.",
    fields: [
      { key: "environmentId", label: "Environment ID", type: "text" },
      { key: "apiSecret", label: "API Secret", type: "password" },
    ]
  },
  {
    id: "auth0",
    name: "Auth0",
    category: "Auth",
    description: "Enterprise grade identity management.",
    fields: [
      { key: "domain", label: "Domain", type: "text", placeholder: "tenant.auth0.com" },
      { key: "clientId", label: "Client ID", type: "text" },
      { key: "clientSecret", label: "Client Secret", type: "password" },
    ]
  },
  {
    id: "firebase",
    name: "Firebase Auth",
    category: "Auth",
    description: "Google's identity platform for apps.",
    fields: [
      { key: "apiKey", label: "API Key", type: "text" },
      { key: "authDomain", label: "Auth Domain", type: "text" },
      { key: "projectId", label: "Project ID", type: "text" },
    ]
  },
  {
    id: "sumsub",
    name: "Sumsub KYC",
    category: "Auth",
    description: "Identity verification and KYC for non-APEDA actors (foreign buyers, arbitrators).",
    docsUrl: "https://developers.sumsub.com",
    fields: [
      { key: "appToken", label: "App Token", type: "password", placeholder: "sbx:..." },
      { key: "secretKey", label: "Secret Key", type: "password" },
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.sumsub.com" },
    ]
  },
  {
    id: "chainalysis",
    name: "Chainalysis KYT",
    category: "Auth",
    description: "AML and sanctions screening of new actor wallets on registration.",
    docsUrl: "https://docs.chainalysis.com",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "endpoint", label: "API Endpoint", type: "text", placeholder: "https://api.chainalysis.com/api/kyt/v2", hint: "KYT v2 endpoint" },
    ]
  },
  {
    id: "docusign",
    name: "DocuSign",
    category: "Auth",
    description: "Fallback e-signature for farmers who cannot use wallet signatures.",
    docsUrl: "https://developers.docusign.com",
    fields: [
      { key: "integrationKey", label: "Integration Key", type: "text" },
      { key: "userId", label: "User ID (API Username)", type: "text" },
      { key: "accountId", label: "Account ID", type: "text" },
      { key: "privateKey", label: "RSA Private Key", type: "password", hint: "Used to generate JWT access tokens" },
    ]
  },

  // --- COMMUNICATION ---
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Communication",
    description: "Transactional email delivery at scale.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "SG...", validate: v => !v.startsWith('SG.') ? 'Must start with SG.' : null },
      { key: "fromEmail", label: "Sender Identity", type: "text" },
    ]
  },
  {
    id: "resend",
    name: "Resend",
    category: "Communication",
    description: "Modern email API for developers.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "re_..." },
      { key: "domain", label: "Sending Domain", type: "text" },
    ]
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "Communication",
    description: "SMS, WhatsApp, and Voice APIs.",
    fields: [
      { key: "accountSid", label: "Account SID", type: "text", placeholder: "AC..." },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "messagingServiceSid", label: "Messaging Service SID", type: "text", placeholder: "MG..." },
    ]
  },
  {
    id: "xmtp",
    name: "XMTP",
    category: "Communication",
    description: "Secure web3 messaging protocol.",
    fields: [
      { key: "privateKey", label: "Client Private Key", type: "password", hint: "Used to sign system messages" },
      { key: "env", label: "Environment", type: "text", placeholder: "production" },
    ]
  },
  {
    id: "push",
    name: "Push Protocol",
    category: "Communication",
    description: "Cross-chain notifications and messaging.",
    fields: [
      { key: "channelAddress", label: "Channel Address", type: "text", placeholder: "0x..." },
      { key: "privateKey", label: "Channel Private Key", type: "password" },
    ]
  },

  // --- STORAGE ---
  {
    id: "s3",
    name: "AWS S3",
    category: "Storage",
    description: "Standard object storage.",
    fields: [
      { key: "bucket", label: "Bucket Name", type: "text" },
      { key: "region", label: "Region", type: "text", placeholder: "us-east-1" },
      { key: "accessKey", label: "Access Key ID", type: "text" },
      { key: "secretKey", label: "Secret Access Key", type: "password" },
    ]
  },
  {
    id: "pinata",
    name: "Pinata",
    category: "Storage",
    description: "IPFS pinning service for NFTs.",
    fields: [
      { key: "jwt", label: "JWT Token", type: "password" },
      { key: "gateway", label: "Gateway URL", type: "text", placeholder: "https://gateway.pinata.cloud" },
    ]
  },
  {
    id: "arweave",
    name: "Irys (Arweave)",
    category: "Storage",
    description: "Permanent decentralized data storage.",
    fields: [
      { key: "rpcUrl", label: "RPC URL", type: "text" },
      { key: "privateKey", label: "Wallet Private Key", type: "password", hint: "Used to pay for storage uploads" },
    ]
  },
  {
    id: "filecoin",
    name: "Lighthouse (Filecoin)",
    category: "Storage",
    description: "Perpetual file storage on Filecoin.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
    ]
  },
  {
    id: "supabase_storage",
    name: "Supabase Storage",
    category: "Storage",
    description: "Storage integrated with Postgres RLS.",
    fields: [
      { key: "projectUrl", label: "Project URL", type: "text" },
      { key: "serviceKey", label: "Service Role Key", type: "password" },
      { key: "bucket", label: "Bucket", type: "text" },
    ]
  },

  // --- DATA / ORACLE ---
  {
    id: "chainlink",
    name: "Chainlink",
    category: "Data",
    description: "Decentralized oracle networks.",
    fields: [
      { key: "subId", label: "VRF Subscription ID", type: "text" },
      { key: "rpcUrl", label: "Chain RPC", type: "text" },
    ]
  },
  {
    id: "graph",
    name: "The Graph",
    category: "Data",
    description: "Index blockchain data with Subgraphs.",
    fields: [
      { key: "apiKey", label: "Query API Key", type: "password" },
      { key: "subgraphId", label: "Subgraph ID", type: "text" },
    ]
  },
  {
    id: "alchemy",
    name: "Alchemy",
    category: "Data",
    description: "Web3 development platform and nodes.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "appId", label: "App ID", type: "text" },
    ]
  },
  {
    id: "moralis",
    name: "Moralis",
    category: "Data",
    description: "Enterprise-grade Web3 APIs.",
    fields: [
      { key: "apiKey", label: "Web3 API Key", type: "password" },
    ]
  },
  {
    id: "pyth",
    name: "Pyth Network",
    category: "Data",
    description: "Real-time market data oracle.",
    fields: [
      { key: "hermesUrl", label: "Hermes Endpoint", type: "text", placeholder: "https://hermes.pyth.network" },
    ]
  },
  {
    id: "apeda_agriexchange",
    name: "APEDA AgriExchange",
    category: "Data",
    description: "Validate APEDA registration numbers and fetch exporter data from AgriExchange.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", hint: "Issued by APEDA for registered platform integrators" },
      { key: "endpoint", label: "API Endpoint", type: "text", placeholder: "https://agriexchange.apeda.gov.in/api/v1" },
    ]
  },
  {
    id: "icegate_api",
    name: "ICEGATE (CBIC)",
    category: "Data",
    description: "Validate shipping bill numbers and retrieve LEO status from ICEGATE customs portal.",
    fields: [
      { key: "userId", label: "CBIC User ID", type: "text", hint: "Registered ICEGATE user ID for the platform" },
      { key: "password", label: "CBIC Password", type: "password" },
      { key: "endpoint", label: "Web Service URL", type: "text", placeholder: "https://www.icegate.gov.in/Webservice" },
    ]
  },
  {
    id: "nppo_dppq",
    name: "NPPO India / DPPQ",
    category: "Data",
    description: "Validate phytosanitary certificate numbers against the DPPQ official registry.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", hint: "Issued by PPQS (Directorate of Plant Protection)" },
      { key: "endpoint", label: "Verification Endpoint", type: "text", placeholder: "https://ppqs.gov.in/api/phytocert/verify" },
    ]
  },

  // --- ANALYTICS ---
  {
    id: "posthog",
    name: "PostHog",
    category: "Analytics",
    description: "Product analytics and feature flags.",
    fields: [
      { key: "apiKey", label: "Project API Key", type: "text", placeholder: "phc_..." },
      { key: "host", label: "Instance Host", type: "text", placeholder: "https://app.posthog.com" },
    ]
  },
  {
    id: "segment",
    name: "Segment",
    category: "Analytics",
    description: "Customer data platform (CDP).",
    fields: [
      { key: "writeKey", label: "Write Key", type: "password" },
    ]
  },
  {
    id: "dune",
    name: "Dune API",
    category: "Analytics",
    description: "Blockchain data analytics.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
    ]
  },
  {
    id: "ga4",
    name: "Google Analytics 4",
    category: "Analytics",
    description: "Web traffic measurement.",
    fields: [
      { key: "measurementId", label: "Measurement ID", type: "text", placeholder: "G-..." },
      { key: "apiSecret", label: "API Secret", type: "password" },
    ]
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    category: "Analytics",
    description: "Event analytics for mobile & web.",
    fields: [
      { key: "projectToken", label: "Project Token", type: "text" },
    ]
  },
  {
    id: "cloudwatch_elk",
    name: "CloudWatch + ELK",
    category: "Analytics",
    description: "Centralized log aggregation for chain events, API access logs, and regulatory audit trail.",
    fields: [
      { key: "awsAccessKey", label: "AWS Access Key ID", type: "text", placeholder: "AKIA..." },
      { key: "awsSecretKey", label: "AWS Secret Access Key", type: "password" },
      { key: "awsRegion", label: "AWS Region", type: "text", placeholder: "ap-south-1" },
      { key: "elkEndpoint", label: "ELK Endpoint", type: "text", placeholder: "https://elk.agrotrace.internal:9200" },
      { key: "elkApiKey", label: "ELK API Key", type: "password" },
    ]
  },
  {
    id: "prometheus_grafana",
    name: "Prometheus + Grafana",
    category: "Analytics",
    description: "Real-time metrics for validator health, block time, tx throughput, and IoT ingestion rates.",
    fields: [
      { key: "prometheusEndpoint", label: "Prometheus Endpoint", type: "text", placeholder: "https://prometheus.agrotrace.internal:9090" },
      { key: "grafanaEndpoint", label: "Grafana Endpoint", type: "text", placeholder: "https://grafana.agrotrace.internal:3000" },
      { key: "grafanaApiKey", label: "Grafana Service API Key", type: "password", hint: "Service account key with Editor role" },
      { key: "alertmanagerUrl", label: "Alertmanager URL", type: "text", placeholder: "https://alertmanager.agrotrace.internal:9093" },
    ]
  },

  // --- WEBHOOKS (Newly populated) ---
  {
    id: "slack_webhook",
    name: "Slack",
    category: "Webhooks",
    description: "Post messages to a Slack channel.",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "password", placeholder: "https://hooks.slack.com/services/...", validate: v => !v.startsWith('https://hooks.slack.com') ? 'Invalid Slack URL' : null },
    ]
  },
  {
    id: "discord_webhook",
    name: "Discord",
    category: "Webhooks",
    description: "Send alerts to a Discord channel.",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "password", placeholder: "https://discord.com/api/webhooks/...", validate: v => !v.includes('discord.com/api') ? 'Invalid Discord URL' : null },
    ]
  },
  {
    id: "telegram_bot",
    name: "Telegram Bot",
    category: "Webhooks",
    description: "Send messages via a Telegram Bot.",
    fields: [
      { key: "botToken", label: "Bot Token", type: "password" },
      { key: "chatId", label: "Chat ID", type: "text" },
    ]
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Webhooks",
    description: "Trigger multi-step Zapier workflows.",
    fields: [
      { key: "webhookUrl", label: "Catch Hook URL", type: "password", placeholder: "https://hooks.zapier.com/..." },
    ]
  },
  {
    id: "custom_webhook",
    name: "Custom Endpoint",
    category: "Webhooks",
    description: "Send JSON payloads to your own server.",
    fields: [
      { key: "url", label: "Endpoint URL", type: "text", placeholder: "https://api.myapp.com/events" },
      { key: "secret", label: "Signing Secret", type: "password", hint: "Used to sign X-Hub-Signature header" },
      { key: "headers", label: "Custom Headers", type: "text", placeholder: '{"Authorization": "Bearer..."}' },
    ]
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    category: "Webhooks",
    description: "Critical incident alerts — temperature breach, chain halt, validator down.",
    docsUrl: "https://developer.pagerduty.com",
    fields: [
      { key: "integrationKey", label: "Events API Integration Key", type: "password", hint: "From the service's Integration tab (Events API v2)" },
      { key: "apiToken", label: "REST API Token", type: "password", hint: "Used to manage incidents and escalation policies" },
      { key: "serviceId", label: "Service ID", type: "text", placeholder: "PXXXXXXX" },
    ]
  },

  // --- STORAGE (continued) ---
  {
    id: "aws_kms",
    name: "AWS KMS",
    category: "Storage",
    description: "Platform signing keys for audit trail PDFs, certificate NFT metadata, and chain signing.",
    docsUrl: "https://docs.aws.amazon.com/kms",
    fields: [
      { key: "keyArn", label: "Key ARN", type: "text", placeholder: "arn:aws:kms:ap-south-1:...", hint: "The CMK used for platform signing" },
      { key: "accessKey", label: "AWS Access Key ID", type: "text", placeholder: "AKIA..." },
      { key: "secretKey", label: "AWS Secret Access Key", type: "password" },
      { key: "region", label: "AWS Region", type: "text", placeholder: "ap-south-1" },
    ]
  },
];

/* ------------------ Brand Logos ------------------ */

const BRAND_META: Record<string, { logoUrl?: string; color: string; initials: string }> = {
  stripe: { logoUrl: 'https://cdn.simpleicons.org/stripe/635BFF', color: '#635BFF', initials: 'ST' },
  paypal: { logoUrl: 'https://cdn.simpleicons.org/paypal/00457C', color: '#00457C', initials: 'PP' },
  coinbase: { logoUrl: 'https://cdn.simpleicons.org/coinbase/1652F0', color: '#1652F0', initials: 'CB' },
  lemonsqueezy: { color: '#FFC233', initials: 'LS' },
  razorpay: { logoUrl: 'https://cdn.simpleicons.org/razorpay/3395FF', color: '#3395FF', initials: 'RZ' },
  clerk: { logoUrl: 'https://cdn.simpleicons.org/clerk/6C47FF', color: '#6C47FF', initials: 'CL' },
  privy: { color: '#6B5CE7', initials: 'PR' },
  dynamic: { color: '#4F46E5', initials: 'DY' },
  auth0: { logoUrl: 'https://cdn.simpleicons.org/auth0/EB5424', color: '#EB5424', initials: 'A0' },
  firebase: { logoUrl: 'https://cdn.simpleicons.org/firebase/FFCA28', color: '#FFA000', initials: 'FB' },
  sumsub: { color: '#00B77A', initials: 'SS' },
  chainalysis: { color: '#0B8EE5', initials: 'CA' },
  docusign: { logoUrl: 'https://cdn.simpleicons.org/docusign/E04646', color: '#E04646', initials: 'DS' },
  sendgrid: { logoUrl: 'https://cdn.simpleicons.org/sendgrid/1A82E2', color: '#1A82E2', initials: 'SG' },
  resend: { logoUrl: 'https://cdn.simpleicons.org/resend/000000', color: '#6366F1', initials: 'RS' },
  twilio: { logoUrl: 'https://cdn.simpleicons.org/twilio/F22F46', color: '#F22F46', initials: 'TW' },
  xmtp: { color: '#FC4F37', initials: 'XM' },
  push: { color: '#DD44B9', initials: 'PU' },
  s3: { logoUrl: 'https://cdn.simpleicons.org/amazons3/569A31', color: '#569A31', initials: 'S3' },
  pinata: { color: '#E5A732', initials: 'PI' },
  arweave: { logoUrl: 'https://cdn.simpleicons.org/arweave/222222', color: '#4B5563', initials: 'AR' },
  filecoin: { logoUrl: 'https://cdn.simpleicons.org/filecoin/0090FF', color: '#0090FF', initials: 'FC' },
  supabase_storage: { logoUrl: 'https://cdn.simpleicons.org/supabase/3ECF8E', color: '#3ECF8E', initials: 'SB' },
  chainlink: { logoUrl: 'https://cdn.simpleicons.org/chainlink/375BD2', color: '#375BD2', initials: 'CL' },
  graph: { logoUrl: 'https://cdn.simpleicons.org/thegraph/6747ED', color: '#6747ED', initials: 'GR' },
  alchemy: { color: '#363FF9', initials: 'AL' },
  moralis: { color: '#2D3748', initials: 'MR' },
  pyth: { color: '#E6007A', initials: 'PY' },
  apeda_agriexchange: { color: '#2E7D32', initials: 'AP' },
  icegate_api: { color: '#1565C0', initials: 'IC' },
  nppo_dppq: { color: '#558B2F', initials: 'NP' },
  posthog: { logoUrl: 'https://cdn.simpleicons.org/posthog/F54E00', color: '#F54E00', initials: 'PH' },
  segment: { logoUrl: 'https://cdn.simpleicons.org/segment/52BD94', color: '#52BD94', initials: 'SG' },
  dune: { color: '#E84142', initials: 'DN' },
  ga4: { logoUrl: 'https://cdn.simpleicons.org/googleanalytics/E37400', color: '#E37400', initials: 'GA' },
  mixpanel: { logoUrl: 'https://cdn.simpleicons.org/mixpanel/7856FF', color: '#7856FF', initials: 'MX' },
  cloudwatch_elk: { logoUrl: 'https://cdn.simpleicons.org/amazonaws/FF9900', color: '#FF9900', initials: 'CW' },
  prometheus_grafana: { logoUrl: 'https://cdn.simpleicons.org/grafana/F46800', color: '#F46800', initials: 'GF' },
  slack_webhook: { logoUrl: 'https://cdn.simpleicons.org/slack/4A154B', color: '#4A154B', initials: 'SL' },
  discord_webhook: { logoUrl: 'https://cdn.simpleicons.org/discord/5865F2', color: '#5865F2', initials: 'DC' },
  telegram_bot: { logoUrl: 'https://cdn.simpleicons.org/telegram/26A5E4', color: '#26A5E4', initials: 'TG' },
  zapier: { logoUrl: 'https://cdn.simpleicons.org/zapier/FF4A00', color: '#FF4A00', initials: 'ZP' },
  custom_webhook: { color: '#6B7280', initials: 'CW' },
  pagerduty: { logoUrl: 'https://cdn.simpleicons.org/pagerduty/06AC38', color: '#06AC38', initials: 'PD' },
  aws_kms: { logoUrl: 'https://cdn.simpleicons.org/amazonaws/FF9900', color: '#FF9900', initials: 'KM' },
};

function BrandLogo({ id, size = 42 }: { id: string; size?: number }) {
  const meta = BRAND_META[id];
  const [err, setErr] = useState(false);
  const imgSize = Math.round(size * 0.55);
  if (meta?.logoUrl && !err) {
    return (
      <img
        src={meta.logoUrl}
        alt={id}
        width={imgSize}
        height={imgSize}
        style={{ objectFit: 'contain', display: 'block' }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <Typography sx={{
      fontSize: Math.round(size * 0.36),
      fontWeight: 900,
      color: meta?.color || '#4F46E5',
      lineHeight: 1,
      letterSpacing: -0.5,
      userSelect: 'none',
    }}>
      {meta?.initials || id.slice(0, 2).toUpperCase()}
    </Typography>
  );
}

/* ------------------ Styled Components ------------------ */

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(13,21,53,0.97)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  boxShadow: '0 20px 40px -8px rgba(0,0,0,0.4)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

/* ------------------ Components ------------------ */

function getIcon(cat: IntegrationCategory) {
  switch (cat) {
    case 'Payments': return <PaymentsIcon fontSize="small" />;
    case 'Auth': return <SecurityIcon fontSize="small" />;
    case 'Communication': return <EmailIcon fontSize="small" />;
    case 'Storage': return <StorageIcon fontSize="small" />;
    case 'Data': return <HubIcon fontSize="small" />;
    case 'Analytics': return <AnalyticsIcon fontSize="small" />;
    case 'Webhooks': return <WebhookIcon fontSize="small" />;
    default: return <HubIcon fontSize="small" />;
  }
}

async function apiGetProject(projectId: string) {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: "GET" });
  if (!res.ok) throw new Error("Load failed");
  return await res.json();
}

async function apiPatchIntegrations(projectId: string, configs: any) {
  await fetch(`/api/projects/${encodeURIComponent(projectId)}/integrations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ configs }),
  });
}

// Extracted to safe hook usage
function IntegrationFieldRow({ 
  field, 
  value, 
  onChange, 
  error 
}: { 
  field: IntegrationDef['fields'][0];
  value: string;
  onChange: (val: string) => void;
  error: string | null;
}) {
  const [show, setShow] = useState(false);

  return (
    <Box>
       <Stack direction="row" justifyContent="space-between" mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>{field.label}</Typography>
          <Link component="button" variant="caption" underline="hover" color="primary" sx={{ fontWeight: 600 }}>Get {field.label}</Link>
       </Stack>
       <TextField
          fullWidth size="small"
          placeholder={field.placeholder}
          type={field.type === 'text' || show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          error={!!error}
          helperText={error || field.hint}
          InputProps={{
             endAdornment: field.type === 'password' && (
                <InputAdornment position="end">
                   <IconButton size="small" onClick={() => setShow(!show)}>
                      {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                   </IconButton>
                </InputAdornment>
             ),
             sx: { fontFamily: field.type === 'password' ? 'monospace' : undefined }
          }}
          sx={{ "& .MuiInputBase-root": { borderRadius: 2 } }}
       />
    </Box>
  );
}

/* ====================================================================== */
export default function Step4({ goPrev, goNext, projectId }: { goPrev?: () => void; goNext?: () => void; projectId: string | null }) {
  const theme = useTheme();
  const router = useRouter();
  const sp = useSearchParams();

  const [resolvedId, setResolvedId] = useState<string | null>(projectId);
  useEffect(() => {
    if (!resolvedId) {
       const ls = typeof window !== 'undefined' ? localStorage.getItem('cerulea.activeProjectId') : null;
       setResolvedId(sp?.get('projectId') || ls);
    }
  }, [projectId, sp, resolvedId]);

  const [activeCat, setActiveCat] = useState<IntegrationCategory>("Payments");
  const [selectedId, setSelectedId] = useState<string>("stripe");
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>({});
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success'|'error'|null>(null);

  const providers = useMemo(() => CATALOG.filter(c => c.category === activeCat), [activeCat]);
  
  // Safe Default Initialization
  const activeConfig = useMemo(() => {
    return configs[selectedId] || { ...DEFAULT_CONFIG };
  }, [configs, selectedId]);
  
  const activeDef = useMemo(() => CATALOG.find(c => c.id === selectedId), [selectedId]);

  useEffect(() => {
    (async () => {
      if (!resolvedId) { setLoading(false); return; }
      try {
        const p = await apiGetProject(resolvedId);
        const integrations = p.project?.integrations ?? p.integrations;
        if (integrations?.configs) setConfigs(integrations.configs);
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [resolvedId]);

  const updateConfig = (patch: Partial<IntegrationConfig>) => {
    setConfigs(prev => {
      const existing = prev[selectedId] || DEFAULT_CONFIG;
      return {
        ...prev,
        [selectedId]: { ...existing, ...patch }
      };
    });
  };

  const updateCred = (key: string, val: string) => {
    setConfigs(prev => {
      const existing = prev[selectedId] || DEFAULT_CONFIG;
      const env = existing.environment || 'dev';
      const envKey = `${env}_${key}`;
      return {
        ...prev,
        [selectedId]: {
          ...existing,
          credentials: { ...(existing.credentials || {}), [envKey]: val }
        }
      };
    });
  };

  const handleTest = async () => {
    if (!activeDef) return;
    setTesting(true);
    setTestResult(null);

    const env = activeConfig.environment || 'dev';
    const credentials: Record<string, string> = {};
    activeDef.fields.forEach(f => {
      const envKey = `${env}_${f.key}`;
      const val = activeConfig.credentials?.[envKey];
      if (val) credentials[f.key] = val;
    });

    // Client-side format validation before hitting the API
    const validationError = activeDef.fields.some(f => {
      const val = credentials[f.key];
      return !val || (f.validate && f.validate(val) !== null);
    });
    if (validationError) {
      setTestResult('error');
      setTesting(false);
      return;
    }

    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: activeDef.id, category: activeDef.category, credentials }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult(res.ok && data.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (resolvedId) await apiPatchIntegrations(resolvedId, configs);
    if (goNext) goNext();
  };

  const CAT_COLOR: Record<IntegrationCategory, string> = {
    Payments: '#10b981', Auth: '#ef4444', Communication: '#3b82f6',
    Storage: '#f97316', Data: '#8b5cf6', Analytics: '#06b6d4', Webhooks: '#f59e0b',
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', position: 'relative' }}>
      <StepGuidance
        stepKey="step4"
        title="Integrations"
        subtitle="Step 5 of 6"
        description="Connect your application to external services: payment processors, KYC providers, storage, oracles, and more. Each integration adds a pre-built connector to your deployment."
        steps={[
          { first: 'Pick a category from the left', next: 'Choose from Payments, Auth, Storage, Data, Analytics, or Webhooks.' },
          { first: 'Select an integration', next: 'Click any row to open its configuration panel on the right.' },
          { first: 'Enable and configure', next: 'Toggle it on, pick Test or Live mode, and paste your API credentials.' },
        ]}
        tip="Only enable integrations your app actually uses. Each enabled integration adds to your deployment footprint and monthly costs."
      />

      {/* 3-pane layout */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Category sidebar ── */}
        <Box sx={{
          width: 200, flexShrink: 0,
          borderRight: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>
              CATEGORIES
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
            {(['Payments', 'Auth', 'Communication', 'Storage', 'Data', 'Analytics', 'Webhooks'] as IntegrationCategory[]).map(cat => {
              const isActive = activeCat === cat;
              const catColor = CAT_COLOR[cat];
              const enabledCount = CATALOG.filter(c => c.category === cat && configs[c.id]?.enabled).length;
              const total = CATALOG.filter(c => c.category === cat).length;
              return (
                <Box key={cat} onClick={() => setActiveCat(cat)} sx={{
                  px: 2, py: 1.25, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  borderLeft: `3px solid ${isActive ? catColor : 'transparent'}`,
                  bgcolor: isActive ? alpha(catColor, 0.08) : 'transparent',
                  color: isActive ? catColor : 'text.secondary',
                  transition: 'all 0.12s',
                  '&:hover': { bgcolor: alpha(catColor, 0.06), color: catColor },
                }}>
                  <Box sx={{ color: 'inherit', display: 'flex', '& .MuiSvgIcon-root': { fontSize: 17 } }}>
                    {getIcon(cat)}
                  </Box>
                  <Typography variant="body2" fontWeight={isActive ? 700 : 500} color="inherit" sx={{ flex: 1, fontSize: '0.82rem' }}>
                    {cat}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.4}>
                    {enabledCount > 0 && (
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>
                        {enabledCount}
                      </Box>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>{total}</Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── CENTER: Integration list ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* List header */}
          <Box sx={{ px: 3, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha(CAT_COLOR[activeCat], 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: CAT_COLOR[activeCat], '& .MuiSvgIcon-root': { fontSize: 16 } }}>
                {getIcon(activeCat)}
              </Box>
              <Typography variant="subtitle1" fontWeight={800}>{activeCat}</Typography>
              <Chip label={providers.length} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(CAT_COLOR[activeCat], 0.1), color: CAT_COLOR[activeCat], border: 'none', fontWeight: 700 }} />
            </Stack>
          </Box>

          {/* Scrollable list */}
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 14 }}>
            {providers.map((def, idx) => {
              const cfg = configs[def.id];
              const isEnabled = cfg?.enabled || false;
              const isSelected = selectedId === def.id;
              const catColor = CAT_COLOR[def.category];
              return (
                <Box
                  key={def.id}
                  onClick={() => setSelectedId(def.id)}
                  sx={{
                    px: 3, py: 2, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2,
                    borderBottom: idx < providers.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    borderLeft: `3px solid ${isSelected ? catColor : 'transparent'}`,
                    bgcolor: isSelected ? alpha(catColor, 0.05) : 'transparent',
                    transition: 'all 0.12s',
                    '&:hover': { bgcolor: isSelected ? alpha(catColor, 0.06) : alpha(theme.palette.action.hover, 0.4) },
                  }}
                >
                  {/* Icon */}
                  <Box sx={{
                    width: 42, height: 42, borderRadius: 2, flexShrink: 0,
                    bgcolor: alpha(catColor, 0.08),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isSelected ? `1px solid ${alpha(catColor, 0.3)}` : `1px solid ${alpha(catColor, 0.12)}`,
                    overflow: 'hidden',
                  }}>
                    <BrandLogo id={def.id} size={42} />
                  </Box>

                  {/* Name + desc */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: isSelected ? catColor : 'text.primary' }}>{def.name}</Typography>
                      {isEnabled && <CheckCircleIcon sx={{ fontSize: 13, color: '#10b981' }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.73rem' }}>
                      {def.description}
                    </Typography>
                  </Box>

                  {/* Enabled badge / arrow */}
                  <Box sx={{ flexShrink: 0 }}>
                    {isEnabled ? (
                      <Chip label="Enabled" size="small" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: `1px solid ${alpha('#10b981', 0.2)}` }} />
                    ) : (
                      <Box sx={{ width: 6, height: 6, borderTop: '2px solid', borderRight: '2px solid', borderColor: 'text.disabled', transform: 'rotate(45deg)' }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── RIGHT: Config panel ── */}
        <Box sx={{
          width: 460, flexShrink: 0,
          borderLeft: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflowY: 'auto', pb: 14,
        }}>
          {!activeDef ? (
            <Box sx={{ p: 5, textAlign: 'center', mt: 6, color: 'text.secondary' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <HubIcon sx={{ fontSize: 34, color: 'primary.main', opacity: 0.4 }} />
              </Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>No integration selected</Typography>
              <Typography variant="caption" color="text.secondary">Pick an integration from the list to configure it here.</Typography>
            </Box>
          ) : (
            <Fade in key={activeDef.id}>
              <Box>
                {/* Config header */}
                <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(CAT_COLOR[activeDef.category], 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2.5,
                      bgcolor: alpha(CAT_COLOR[activeDef.category], 0.08),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${alpha(CAT_COLOR[activeDef.category], 0.18)}`,
                      overflow: 'hidden',
                    }}>
                      <BrandLogo id={activeDef.id} size={48} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={800}>{activeDef.name}</Typography>
                      <Chip label={activeDef.category} size="small" sx={{ height: 18, mt: 0.25, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(CAT_COLOR[activeDef.category], 0.1), color: CAT_COLOR[activeDef.category], border: 'none' }} />
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
                    {activeDef.description}
                  </Typography>
                  {activeDef.docsUrl && (
                    <Link href={activeDef.docsUrl} target="_blank" underline="hover" color="primary"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.78rem', fontWeight: 600, mt: 1 }}>
                      View Documentation <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Link>
                  )}
                </Box>

                {/* Enable toggle */}
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" p={1.75}
                    sx={{ bgcolor: activeConfig.enabled ? alpha('#10b981', 0.06) : alpha(theme.palette.action.hover, 0.3), borderRadius: 2, border: `1px solid ${activeConfig.enabled ? alpha('#10b981', 0.2) : 'transparent'}` }}>
                    <Stack>
                      <Typography variant="body2" fontWeight={700}>Enable {activeDef.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{activeConfig.enabled ? 'Active in your deployment' : 'Disabled — not included'}</Typography>
                    </Stack>
                    <Switch checked={activeConfig.enabled} onChange={e => updateConfig({ enabled: e.target.checked })} size="small" />
                  </Stack>
                </Box>

                {/* Credentials — only when enabled */}
                {activeConfig.enabled && (
                  <Box sx={{ px: 3, py: 2.5 }}>
                    {/* Env toggle */}
                    <Stack direction="row" spacing={0.5} bgcolor={alpha(theme.palette.primary.main, 0.06)} p={0.5} borderRadius={2} mb={2.5} border={`1px solid ${alpha(theme.palette.primary.main, 0.1)}`}>
                      <Button size="small" fullWidth variant={activeConfig.environment === 'dev' ? 'contained' : 'text'}
                        onClick={() => updateConfig({ environment: 'dev' })}
                        sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem' }}>
                        Test Mode
                      </Button>
                      <Button size="small" fullWidth variant={activeConfig.environment === 'prod' ? 'contained' : 'text'}
                        onClick={() => updateConfig({ environment: 'prod' })}
                        color="secondary" sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem' }}>
                        Live Mode
                      </Button>
                    </Stack>

                    <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'text.disabled', display: 'block', mb: 1.5 }}>
                      CREDENTIALS — {activeConfig.environment === 'prod' ? 'LIVE' : 'TEST'} MODE
                    </Typography>

                    <Stack spacing={2}>
                      {activeDef.fields.map(field => {
                        const envKey = `${activeConfig.environment || 'dev'}_${field.key}`;
                        const val = activeConfig.credentials?.[envKey] || '';
                        const err = field.validate ? field.validate(val) : null;
                        return (
                          <IntegrationFieldRow key={field.key} field={field} value={val}
                            onChange={v => updateCred(field.key, v)} error={err} />
                        );
                      })}
                    </Stack>

                    {/* Test button */}
                    <Stack spacing={1} mt={2.5}>
                      <Button fullWidth variant="outlined" size="small" onClick={handleTest} disabled={testing}
                        startIcon={testing ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                        sx={{ borderRadius: 2, borderColor: alpha(theme.palette.primary.main, 0.4), fontWeight: 700 }}>
                        {testing ? 'Testing Connection...' : 'Test Connection'}
                      </Button>
                      {testResult === 'success' && <Typography variant="caption" color="success.main" fontWeight={700} sx={{ textAlign: 'center' }}>✓ Connection successful</Typography>}
                      {testResult === 'error' && <Typography variant="caption" color="error.main" fontWeight={700} sx={{ textAlign: 'center' }}>✗ Check your credentials and try again</Typography>}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {/* Dock — flex footer, never overlaps content */}
      <Box sx={{
        flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2,
        borderTop: `1px solid ${alpha('#4F46E5', 0.12)}`,
        bgcolor: 'background.paper',
      }}>
        <FloatingIsland elevation={6}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev ? goPrev : () => router.back()} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Tooltip title="Help">
            <IconButton size="small" color="primary" onClick={() => setIsHelpOpen(true)}><QuestionMarkIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Button variant="contained" onClick={handleSave} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}>
            Complete
          </Button>
        </FloatingIsland>
      </Box>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1, bgcolor: 'background.paper', color: 'text.primary' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>Integrations Guide</Typography>
          <IconButton onClick={() => setIsHelpOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" paragraph>
            Connect your application to external services.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <b>Dev vs Prod:</b> Use 'Test Mode' keys for local development. Switch to 'Live Mode' before deploying.<br/>
            • <b>Webhooks:</b> Ensure your webhook secret matches what is in your provider dashboard to verify signatures.<br/>
            • <b>Validation:</b> Use the 'Test Connection' button to verify your API keys are active and have correct permissions.
          </Typography>
        </DialogContent>
      </Dialog>

    </Box>
  );
}