import React from 'react'
import {
  Heading, Hr, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailLayout } from './layout'

export interface JoinApplicationProps {
  fullName?: string
  memberType?: 'individual' | 'organisation'
  email?: string
  phone?: string
  organisationName?: string
  organisationType?: string
  roleTitle?: string
  location?: string
  website?: string
  linkedin?: string
  tierLabel?: string
  amountLabel?: string
  paymentStatus?: string
  sdgFocus?: string[]
  sectors?: string[]
  goals?: string[]
  contributions?: string[]
  eventsInterested?: string[]
  eventRole?: string
  heardFrom?: string
  commPreference?: string
  aumRange?: string
  investmentStage?: string
  capitalProvided?: string
  statement?: string
  personalTitle?: string
  qualification?: string
  qualificationDepartment?: string
  qualificationPosition?: string
  qualificationInstitution?: string
  researchInterests?: string
  researchArea?: string
  bio?: string
  submittedAt?: string
}

const list = (v?: string[]) => (v && v.length ? v.join(', ') : '—')
const val = (v?: string) => (v && v.trim() ? v : '—')

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={row}>
    <span style={rowLabel}>{label}</span>
    <br />
    <span style={rowValue}>{value}</span>
  </Text>
)

const JoinApplicationEmail = (p: JoinApplicationProps) => (
  <EmailLayout
    preview={`New NIEC application — ${val(p.organisationName)} (${val(p.tierLabel)})`}
    eyebrow="NIEC Connect · Membership"
    title="New membership application"
    highlight={
      <>
        <Text style={highlightLine}><strong>{val(p.organisationName)}</strong></Text>
        <Text style={highlightLine}>Tier requested: <strong>{val(p.tierLabel)}</strong></Text>
        <Text style={highlightLine}>Fee: <strong>{val(p.amountLabel)}</strong> · Payment: {val(p.paymentStatus)}</Text>
        <Text style={highlightMuted}>Submitted {val(p.submittedAt)}</Text>
      </>
    }
    footer="This application is also available in the NIEC Connect admin CRM under Applications."
  >

        <Heading as="h2" style={h2}>Primary contact</Heading>
        <Row label="Applicant type" value={p.memberType === 'individual' ? 'Individual' : 'Organisation'} />
        <Row label="Name" value={val(p.fullName)} />
        {p.memberType === 'individual' && <Row label="Title" value={val(p.personalTitle)} />}
        <Row label="Role" value={val(p.roleTitle)} />
        <Row label="Email" value={val(p.email)} />
        <Row label="Phone" value={val(p.phone)} />
        <Row label="LinkedIn" value={val(p.linkedin)} />
        <Row label="Preferred channel" value={val(p.commPreference)} />

        <Hr style={hr} />
        {p.memberType === 'individual' ? (
          <>
            <Heading as="h2" style={h2}>Individual profile</Heading>
            <Row label="Department" value={val(p.qualificationDepartment)} />
            <Row label="Position" value={val(p.qualificationPosition)} />
            <Row label="Institution or organisation" value={val(p.qualificationInstitution)} />
            <Row label="Research interests" value={val(p.researchInterests)} />
            <Row label="Research area" value={val(p.researchArea)} />
            <Row label="State" value={val(p.location)} />
            <Row label="Bio / description" value={val(p.bio)} />
          </>
        ) : (
          <>
            <Heading as="h2" style={h2}>Organisation</Heading>
            <Row label="Type" value={val(p.organisationType)} />
            <Row label="Location" value={val(p.location)} />
            <Row label="Website" value={val(p.website)} />
            <Row label="AUM / annual budget" value={val(p.aumRange)} />
            <Row label="Investment stage focus" value={val(p.investmentStage)} />
            <Row label="Capital provided" value={val(p.capitalProvided)} />
          </>
        )}

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Focus & engagement</Heading>
        <Row label="SDG focus" value={list(p.sdgFocus)} />
        <Row label="Sectors" value={list(p.sectors)} />
        <Row label="Goals from NIEC" value={list(p.goals)} />
        <Row label="Can contribute" value={list(p.contributions)} />
        <Row label="Events of interest" value={list(p.eventsInterested)} />
        <Row label="Participation role" value={val(p.eventRole)} />
        <Row label="Heard about NIEC via" value={val(p.heardFrom)} />

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Statement of intent</Heading>
        <Text style={rowValue}>{val(p.statement)}</Text>

  </EmailLayout>
)

export const template = {
  component: JoinApplicationEmail,
  subject: (d: Record<string, any>) =>
    `New NIEC application — ${d['organisationName'] || 'Applicant'} (${d['tierLabel'] || 'Observer'})`,
  displayName: 'Join application (NIEC team)',
  to: 'sefosaaustin@impactinvestorsfoundation.org',
  previewData: {
    fullName: 'Amina Bello',
    memberType: 'organisation',
    email: 'amina@example.org',
    organisationName: 'Sahel Impact Capital',
    organisationType: 'Impact investor / fund manager',
    roleTitle: 'Director of Investments',
    location: 'Lagos',
    tierLabel: 'Growth Partner',
    amountLabel: '₦500,000',
    paymentStatus: 'Pending',
    sdgFocus: ['SDG 8 — Decent work'],
    sectors: ['Agri-food systems'],
    statement: 'We want to co-invest alongside NIEC members across Nigerian agri-food systems.',
    submittedAt: '8 September 2026',
  },
} satisfies TemplateEntry

const h2 = { margin: '20px 0 8px', fontSize: '14px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#0B4F3A' }
const highlightLine = { margin: '0 0 4px', fontSize: '14px', color: '#12261F' }
const highlightMuted = { margin: '6px 0 0', fontSize: '12px', color: '#5B6B64' }
const row = { margin: '0 0 10px' }
const rowLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.6px', color: '#7A8A83' }
const rowValue = { fontSize: '14px', color: '#12261F' }
const hr = { borderColor: '#E3EBE7', margin: '18px 0' }
