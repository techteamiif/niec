import * as React from 'react'

import {
  Button,
  Link,
  Text,
} from '@react-email/components'
import { EmailLayout, emailButton, emailLink, emailText } from './layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout
    preview={`Confirm your email for ${siteName}`}
    eyebrow="NIEC Connect · Account"
    title="Confirm your email address"
    footer="If you didn't create an account, you can safely ignore this email."
    darkModeCss={darkModeCss}
  >
    <Text style={emailText}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={emailLink}><strong>{siteName}</strong></Link>!
    </Text>
    <Text style={emailText}>
      Confirm your email address ({' '}
      <Link href={`mailto:${recipient}`} style={emailLink}>{recipient}</Link>
      {' '}) to activate your account. After confirmation, you will see a success page with a button to continue to your application.
    </Text>
    <Button className="dm-btn" style={emailButton} href={confirmationUrl}>
      Confirm email address
    </Button>
  </EmailLayout>
)

export default SignupEmail
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`
