import { useState } from 'react'
import { Button } from '#/components/ui/button'

export function BackupCodesDisplay({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)

  function handleCopyAll() {
    void navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopyAll} className="flex-1">
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownload} className="flex-1">
          Download .txt
        </Button>
      </div>
    </div>
  )
}
