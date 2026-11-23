import * as React from 'react'

import {
  Button,
  Text,
} from '@react-email/components'
import { EmailLayout, emailButton, emailText } from './layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <EmailLayout
    preview={`Your login link for ${siteName}`}
    eyebrow="NIEC Connect · Security"
    title="Your login link"
    footer="If you didn't request this link, you can safely ignore this email."
    darkModeCss={darkModeCss}
  >
    <Text style={emailText}>
      Click the button below to log in to {siteName}. This link will expire shortly.
    </Text>
    <Button className="dm-btn" style={emailButton} href={confirmationUrl}>
      Log In
    </Button>
  </EmailLayout>
)

export default MagicLinkEmail
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
