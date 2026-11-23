import * as React from 'react'

import {
  Text,
} from '@react-email/components'
import { EmailLayout, emailCode, emailText } from './layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Your verification code"
    eyebrow="NIEC Connect · Security"
    title="Confirm reauthentication"
    footer="This code will expire shortly. If you didn't request this, you can safely ignore this email."
  >
    <Text style={emailText}>Use the code below to confirm your identity:</Text>
    <Text style={emailCode}>{token}</Text>
  </EmailLayout>
)

export default ReauthenticationEmail
