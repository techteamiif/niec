import * as React from 'react'

import {
  Button,
  Link,
  Text,
} from '@react-email/components'
import { EmailLayout, emailButton, emailLink, emailText } from './layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview={`Confirm your email change for ${siteName}`}
    eyebrow="NIEC Connect · Account"
    title="Confirm your email change"
    footer="If you didn't request this change, please secure your account immediately."
    darkModeCss={darkModeCss}
  >
    <Text style={emailText}>
      You requested to change your email address for {siteName} from{' '}
      <Link href={`mailto:${oldEmail}`} style={emailLink}>{oldEmail}</Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={emailLink}>{newEmail}</Link>.
    </Text>
    <Text style={emailText}>Click the button below to confirm this change:</Text>
    <Button className="dm-btn" style={emailButton} href={confirmationUrl}>
      Confirm Email Change
    </Button>
  </EmailLayout>
)

export default EmailChangeEmail
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
