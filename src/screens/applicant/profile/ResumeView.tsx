import type { ReactNode } from 'react'
import { scoreLevel } from '@/lib/assessment/question-bank'
import { categoryById } from '@/lib/assessment/work-categories'
import { initials } from '@/lib/format'
import { fullName, resumeSections } from '@/lib/resume'
import { ScoreFigure } from '@/components/ui/Meter'
import type { ApplicantProfile } from '@/types'

function formatUpdated(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString()
    ? `today at ${time}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`
}

/**
 * The saved resume, read-only, as an employer will read it. The story of the
 * applicant (about, scores, experience, education) runs down the wide column;
 * the facts someone looks up (contact, skills, tools) sit in the side panel.
 * In the page's reading order the wide column comes first.
 */
export function ResumeView({ profile, skills, onEdit }: { profile: ApplicantProfile; skills: string[]; onEdit: () => void }) {
  const name = fullName(profile) || 'Your name'
  const updated = formatUpdated(profile.updatedAt)
  const sections = resumeSections(profile)
  const done = sections.filter(s => s.done).length
  const missing = sections.filter(s => !s.done).map(s => s.label)
  const experience = (profile.experience ?? []).filter(x => x.title.trim() || x.company.trim())
  const trainings = (profile.trainings || '').split('\n').map(t => t.trim()).filter(Boolean)
  const checks = Object.entries(profile.categoryScores ?? {}).sort((a, b) => b[1].score - a[1].score)
  const headline = [profile.disabilityType, profile.location, (profile.workSetup ?? []).join(' or ')].filter(Boolean)

  return (
    <div className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24">
      <article aria-labelledby="pf-view-title" className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <header className="px-6 sm:px-8 py-6 flex flex-wrap items-center gap-5 border-b border-gray-200">
          <span aria-hidden="true" className="w-20 h-20 shrink-0 rounded-full bg-[#1a4fa0] text-white text-2xl font-bold grid place-items-center">
            {initials(name)}
          </span>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">My resume</p>
            <h1 id="pf-view-title" tabIndex={-1} className="text-3xl font-bold text-gray-900 leading-tight">{name}</h1>
            {headline.length > 0 && <p className="mt-0.5 text-base text-gray-700">{headline.join(' · ')}</p>}
            <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-[#1a7a3c]">
              <span aria-hidden="true" className="w-5 h-5 rounded-full bg-[#1a7a3c] text-white text-xs grid place-items-center">✓</span>
              Saved{updated && <span className="text-gray-600 font-normal">· last updated {updated}</span>}
            </p>
          </div>
          <button type="button" onClick={onEdit} className="btn-primary min-h-11 flex items-center gap-2 px-5">
            <span aria-hidden="true">✎</span> Edit resume
          </button>
        </header>

        {/* Only while something is missing: a finished resume does not need a full-width bar saying so */}
        {missing.length > 0 && (
          <div className="px-6 sm:px-8 py-4 bg-[#eff6ff] border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="font-semibold text-gray-900">Resume strength: {done} of {sections.length} sections added</p>
              <div aria-hidden="true" className="flex-1 min-w-[8rem] h-2.5 rounded-full bg-white border border-[#1a4fa0] overflow-hidden">
                <div className="h-full bg-[#1a4fa0]" style={{ width: `${(done / sections.length) * 100}%` }} />
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-700">Still to add: {missing.join(', ')}. A fuller resume helps employers understand your skills.</p>
          </div>
        )}

        <div className="px-6 sm:px-8 py-7 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 min-w-0">
            <ResumeSection id="pf-v-about" title="About me">
              {profile.about?.trim()
                ? <p className="text-base text-gray-900 whitespace-pre-line max-w-4xl">{profile.about}</p>
                : <Empty>No introduction added yet.</Empty>}
            </ResumeSection>

            <ResumeSection id="pf-v-skills" title="Top skills">
              <ChipList items={skills} empty="No skills added yet." />
            </ResumeSection>

            <ResumeSection id="pf-v-checks" title="Skills check scores">
              {checks.length === 0 ? (
                <Empty>No skills check taken yet. Take one on the Assessments page.</Empty>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {checks.map(([id, r]) => (
                    <li key={id} className="rounded-xl border border-gray-300 p-4">
                      <p className="font-semibold text-gray-900 mb-2">{categoryById(id)?.name ?? id}</p>
                      <ScoreFigure score={r.score} level={scoreLevel(r.score)} />
                      <p className="mt-2 text-sm text-gray-700">{r.correct} of {r.total} answers right</p>
                    </li>
                  ))}
                </ul>
              )}
            </ResumeSection>

            <ResumeSection id="pf-v-exp" title="Work experience">
              {experience.length ? (
                <ul className="space-y-4">
                  {experience.map((x, i) => (
                    <li key={i} className="border-l-4 border-[#1a4fa0] pl-4">
                      <p className="text-base font-semibold text-gray-900">{x.title || 'Untitled role'}</p>
                      <p className="text-sm text-gray-700">{[x.company, x.period].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              ) : <Empty>No work experience added.</Empty>}
            </ResumeSection>

            <ResumeSection id="pf-v-edu" title="Education and training">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <ResumeItem label="Highest education" value={profile.educationLevel} />
                <ResumeItem label="School and course" value={profile.school} />
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-600">Trainings and certifications</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {trainings.length
                      ? <ul className="list-disc pl-5 space-y-0.5">{trainings.map(t => <li key={t}>{t}</li>)}</ul>
                      : <span className="text-gray-600 font-normal">Not provided</span>}
                  </dd>
                </div>
              </dl>
            </ResumeSection>

            <ResumeSection id="pf-v-acc" title="Accommodations I would ask for">
              {(profile.accommodations ?? []).length
                // sentences, not chips: these are requests an employer reads in full
                ? <ul className="list-disc pl-5 space-y-1 text-base text-gray-900">{profile.accommodations!.map(a => <li key={a}>{a}</li>)}</ul>
                : <Empty>Not provided</Empty>}
            </ResumeSection>
          </div>

          <div className="space-y-7 min-w-0 bg-gray-50 rounded-xl border border-gray-200 p-5 self-start w-full">
            <ResumeSection id="pf-v-contact" title="Contact">
              <dl className="space-y-3">
                <ResumeItem label="Email" value={profile.email} />
                <ResumeItem label="Mobile number" value={profile.mobile ? `+63 ${profile.mobile}` : ''} />
                <ResumeItem label="City or province" value={profile.location} />
              </dl>
            </ResumeSection>

            <ResumeSection id="pf-v-personal" title="Personal details">
              <dl className="space-y-3">
                <ResumeItem label="Disability type" value={profile.disabilityType} />
                <ResumeItem label="Gender" value={profile.gender} />
              </dl>
            </ResumeSection>

            <ResumeSection id="pf-v-tools" title="Tools and preferences">
              <div className="space-y-4">
                <Group label="Assistive technology"><ChipList items={profile.assistiveTech ?? []} empty="Not provided" /></Group>
                <Group label="Preferred work setup"><ChipList items={profile.workSetup ?? []} empty="Not provided" /></Group>
                <Group label="Languages"><ChipList items={profile.languages ?? []} empty="Not provided" /></Group>
              </div>
            </ResumeSection>

          </div>
        </div>

        <footer className="px-6 sm:px-8 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700">
          Employers see this resume when you apply for a job.
        </footer>
      </article>
    </div>
  )
}

function ResumeSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-sm font-bold uppercase tracking-wider text-[#1a4fa0] pb-2 mb-3 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm text-gray-600 mb-1.5">{label}</h3>
      {children}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-600">{children}</p>
}

function ResumeItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-base font-medium text-gray-900 break-words">{value || <span className="text-gray-600 font-normal">Not provided</span>}</dd>
    </div>
  )
}

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(s => (
        <li key={s} className="px-3 py-1 rounded-full border border-[#1a4fa0] bg-white text-[#1a4fa0] font-semibold text-sm">{s}</li>
      ))}
    </ul>
  )
}
