import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { jobIsOpen } from '@/lib/jobs/job-post'
import { recommendedSkills, searchableSkills, SKILL_VOCABULARY } from '@/lib/jobs/skills'
import { SKILL_CHOICES } from '@/lib/resume'
import type { Job } from '@/types'

// What the skill picker searches and recommends. Read from the job posts once per
// screen, so recommendations follow what employers are asking for right now.
export function useSkillSources() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  useEffect(() => {
    let live = true
    api.getJobs().then((js: Job[]) => { if (live) setJobs(js) }).catch(() => { if (live) setJobs([]) })
    return () => { live = false }
  }, [])
  return {
    jobs,
    searchable: jobs ? searchableSkills(jobs) : SKILL_VOCABULARY,
    recommended: jobs ? recommendedSkills(jobs) : SKILL_CHOICES,
    fromJobs: !!jobs?.some(j => jobIsOpen(j) && j.skills?.trim()),
  }
}
