import * as React from 'react'

import {
  Button,
  Link,
  Text,
} from '@react-email/components'
import { EmailLayout, emailButton, emailLink, emailText } from './layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailLayout
    preview={`You've been invited to join ${siteName}`}
    eyebrow="NIEC Connect · Invitation"
    title="You've been invited"
    footer="If you weren't expecting this invitation, you can safely ignore this email."
    darkModeCss={darkModeCss}
  >
    <Text style={emailText}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={emailLink}><strong>{siteName}</strong></Link>.
      {' '}Click the button below to accept the invitation and create your account.
    </Text>
    <Button className="dm-btn" style={emailButton} href={confirmationUrl}>
      Accept Invitation
    </Button>
  </EmailLayout>
)

export default InviteEmail
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
