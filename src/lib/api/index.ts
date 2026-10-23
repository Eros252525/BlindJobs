// Everything that talks to Supabase, by topic: one file per kind of data.
// Screens import from '@/lib/api' and never from the files inside it.

import { emailAvailable, usernameAvailable, register, login } from './auth'
import { sendEmailCode, verifyEmailCode, sendResetCode, resetPassword } from './email'
import { getProfile, updateProfile } from './profile'
import { takeOldHealthAssessment } from './health'
import { getJobs, postJob, updateJob, getEmployerJobs, updateJobStatus, deleteJob } from './jobs'
import { applyToJob, getAppliedJobs, getMyApplications, getApplicationStage, getEmployerApplicants, updateStage } from './applications'
import { getNotifications, markNotificationsRead } from './notifications'
import { getConversations, createConversation, getMessages, getMessagesFor, deleteMessageForEveryone, deleteMessagesForMe, deleteConversationsForMe, sendMessage, getUnreadMessages, getInbox, getDeletedConversationJobIds, setConversationsPinned, markAllConversationsRead, markConversationRead } from './messages'

export { emailAvailable, usernameAvailable, register, login, sendEmailCode, verifyEmailCode, sendResetCode, resetPassword, getProfile, updateProfile, takeOldHealthAssessment, getJobs, postJob, updateJob, getEmployerJobs, updateJobStatus, deleteJob, applyToJob, getAppliedJobs, getMyApplications, getApplicationStage, getEmployerApplicants, updateStage, getNotifications, markNotificationsRead, getConversations, createConversation, getMessages, getMessagesFor, deleteMessageForEveryone, deleteMessagesForMe, deleteConversationsForMe, sendMessage, getUnreadMessages, getInbox, getDeletedConversationJobIds, setConversationsPinned, markAllConversationsRead, markConversationRead }

export const api = {
  register, login, emailAvailable, usernameAvailable, sendEmailCode, verifyEmailCode, sendResetCode, resetPassword,
  getProfile, updateProfile,
  takeOldHealthAssessment,
  getJobs, postJob, updateJob, getEmployerJobs, updateJobStatus, deleteJob,
  applyToJob, getAppliedJobs, getApplicationStage, getEmployerApplicants, updateStage,
  getConversations, createConversation, getMessages, sendMessage,
  getUnreadMessages, markConversationRead, markAllConversationsRead, getInbox, setConversationsPinned, getMyApplications,
  getMessagesFor, deleteMessageForEveryone, deleteMessagesForMe, deleteConversationsForMe, getDeletedConversationJobIds,
  getNotifications, markNotificationsRead,
}
