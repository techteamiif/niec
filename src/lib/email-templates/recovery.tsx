import * as React from 'react'

import {
  Button,
  Text,
} from '@react-email/components'
import { EmailLayout, emailButton, emailText } from './layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <EmailLayout
    preview={`Reset your password for ${siteName}`}
    eyebrow="NIEC Connect · Security"
    title="Reset your password"
    footer="If you didn't request a password reset, you can safely ignore this email. Your password will not be changed."
    darkModeCss={darkModeCss}
  >
    <Text style={emailText}>
      We received a request to reset your password for {siteName}. Click the button below to choose a new password.
    </Text>
    <Button className="dm-btn" style={emailButton} href={confirmationUrl}>
      Reset Password
    </Button>
  </EmailLayout>
)

export default RecoveryEmail
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
