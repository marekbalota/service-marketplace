import { useState, useRef, useEffect } from 'react'
import { saveAs } from 'file-saver'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'

export type BackupCodeEntry = { code: string; usedAt: string | null }

export function BackupCodesDisplay({ codes }: { codes: BackupCodeEntry[] }) {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    [],
  )

  function handleCopyAll() {
    void navigator.clipboard.writeText(codes.map((e) => e.code).join('\n'))
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    saveAs(
      new Blob([codes.map((e) => e.code).join('\n')], { type: 'text/plain' }),
      'backup-codes.txt',
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-4 font-mono text-sm">
        {codes.map((entry) => (
          <span
            key={entry.code}
            className={cn(entry.usedAt !== null && 'line-through text-muted-foreground')}
          >
            {entry.code}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          className="flex-1"
        >
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          Download as .txt
        </Button>
      </div>
    </div>
  )
}
