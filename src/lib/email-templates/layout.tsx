import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface EmailLayoutProps {
  preview: string
  eyebrow: string
  title: string
  highlight?: React.ReactNode
  children: React.ReactNode
  footer: string
  darkModeCss?: string
}

export const EmailLayout = ({
  preview,
  eyebrow,
  title,
  highlight,
  children,
  footer,
  darkModeCss,
}: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head>{darkModeCss ? <style>{darkModeCss}</style> : null}</Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={eyebrowStyle}>{eyebrow}</Text>
          <Heading style={h1}>{title}</Heading>
        </Section>

        {highlight ? <Section style={highlightStyle}>{highlight}</Section> : null}
        {children}

        <Text style={footerStyle}>{footer}</Text>
      </Container>
    </Body>
  </Html>
)

export const emailText = {
  fontSize: '14px',
  color: '#12261F',
  lineHeight: '1.6',
  margin: '18px 0 0',
} as const

export const emailLink = {
  color: '#0B4F3A',
  textDecoration: 'underline',
} as const

export const emailButton = {
  backgroundColor: '#0B4F3A',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #0B4F3A',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
  marginTop: '18px',
} as const

export const emailCode = {
  backgroundColor: '#F2F8F5',
  borderRadius: '10px',
  color: '#0B4F3A',
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  letterSpacing: '4px',
  margin: '18px 0 0',
  padding: '16px',
  textAlign: 'center' as const,
} as const

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
} as const

const container = {
  maxWidth: '640px',
  padding: '24px',
} as const

const header = {
  borderBottom: '3px solid #C9A227',
  paddingBottom: '12px',
} as const

const eyebrowStyle = {
  color: '#C9A227',
  fontSize: '11px',
  letterSpacing: '1.5px',
  margin: '0',
  textTransform: 'uppercase' as const,
} as const

const h1 = {
  color: '#0B4F3A',
  fontSize: '22px',
  margin: '6px 0 0',
} as const

const highlightStyle = {
  backgroundColor: '#F2F8F5',
  borderRadius: '10px',
  margin: '18px 0 0',
  padding: '16px',
} as const

const footerStyle = {
  borderTop: '1px solid #E3EBE7',
  color: '#7A8A83',
  fontSize: '12px',
  margin: '24px 0 0',
  paddingTop: '16px',
} as const
