import { useState } from 'react'
import { Workflow, Plus, MoveHorizontal } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Panel } from '@/components/ui/Panel'
import { EngineNotice } from '@/components/laboratory/EngineNotice'
import { PipelineViz } from '@/components/laboratory/PipelineViz'
import { PIPELINE_PRESETS } from '@/crypto/pipeline/stages'

/**
 * PIPELINE BUILDER (shell).
 * Choose a preset pipeline and inspect its ordered stages. Adding, removing
 * and drag-reordering stages becomes interactive in Step 2.
 */
export function PipelineLab() {
  const [presetId, setPresetId] = useState(PIPELINE_PRESETS[0].id)
  const preset = PIPELINE_PRESETS.find((p) => p.id === presetId) ?? PIPELINE_PRESETS[0]

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MODULE 04 // PIPELINE"
        title="Pipeline Builder"
        sub="Combine multiple cryptographic techniques into a transformation pipeline. Stack the stages, then watch data pass through each."
      />

      <EngineNotice text="Stage add / remove / reorder and live data flow arrive in Step 2." />

      <Panel label="PRESETS" title="Start from a configuration">
        <div className="flex flex-wrap gap-2">
          {PIPELINE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPresetId(p.id)}
              aria-pressed={presetId === p.id}
              className={
                presetId === p.id
                  ? 'rounded-full border border-[rgb(var(--c-core))] bg-[rgba(94,234,212,0.1)] px-3.5 py-1.5 text-xs font-medium text-[var(--c-text)]'
                  : 'rounded-full border border-[var(--c-border)] px-3.5 py-1.5 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[var(--c-border-strong)] hover:text-[var(--c-text)]'
              }
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="mono-label mt-3 !text-[0.55rem] text-[var(--c-text-faint)]">
          {preset.description.toUpperCase()}
        </p>
      </Panel>

      <Panel label="ASSEMBLY" title={`${preset.stages.length}-stage transformation`}>
        <PipelineViz stages={preset.stages} activeStage={0} />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--c-border-strong)] px-4 py-2 text-xs text-[var(--c-text-dim)] transition-colors hover:border-[rgb(var(--c-core))] hover:text-[var(--c-text)]"
          aria-label="Add cipher stage"
        >
          <Plus size={14} />
          ADD STAGE
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] px-4 py-2 text-xs text-[var(--c-text-faint)]">
          <MoveHorizontal size={14} />
          Drag to reorder (Step 2)
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[rgba(0,0,0,0.15)] px-5 py-4 text-xs text-[var(--c-text-dim)]">
        <Workflow size={16} className="shrink-0 text-[rgb(var(--c-core))]" aria-hidden="true" />
        <span>
          A pipeline chains ciphers — output of one feeds the next. Order changes the result entirely.
        </span>
      </div>
    </div>
  )
}
