export type Role = 'SEEKER' | 'EMPLOYER' | 'ADMIN';
export type Country = 'AU' | 'NZ';
export type WorkType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL';
export type Workplace = 'ONSITE' | 'HYBRID' | 'REMOTE';
export type JobStatus = 'OPEN' | 'CLOSED';
export type ApplicationStatus = 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'OFFERED' | 'REJECTED' | 'WITHDRAWN';
export type WorkRights = 'CITIZEN_PR' | 'WORKING_HOLIDAY' | 'STUDENT' | 'TEMPORARY_VISA' | 'REQUIRES_SPONSORSHIP';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: { id: string; name: string } | null;
}

export interface Meta {
  categories: string[];
  countries: Record<Country, string>;
  locations: Record<Country, Record<string, string>>;
  workTypes: Record<WorkType, string>;
  workplaces: Record<Workplace, string>;
  workRights: Record<WorkRights, string>;
  applicationStatuses: Record<ApplicationStatus, string>;
}

export interface JobInput {
  title: string;
  description: string;
  category: string;
  country: Country;
  region: string;
  city: string;
  workType: WorkType;
  workplace: Workplace;
  salaryMin: number | null;
  salaryMax: number | null;
  sponsorship: boolean;
}

export interface JobBase extends Omit<JobInput, 'description'> {
  id: string;
  companyId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobListItem extends JobBase {
  company: { id: string; name: string; location: string | null };
  saved: boolean;
  applicationStatus: ApplicationStatus | null;
}

export interface JobDetail extends JobBase {
  description: string;
  company: { id: string; name: string; website: string | null; location: string | null; description: string | null };
  isOwner: boolean;
  saved: boolean;
  applicationStatus: ApplicationStatus | null;
}

export interface EmployerJob extends JobBase {
  applicants: { total: number; new: number };
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  description: string | null;
}

export interface SeekerProfileFields {
  headline: string | null;
  location: string | null;
  about: string | null;
  skills: string[];
  workRights: WorkRights | null;
  resumeUrl: string | null;
}

export interface SeekerProfile extends SeekerProfileFields {
  name: string;
  email: string;
  /** Private: used for job matching, never shown to employers */
  resumeText: string | null;
}

export interface JobMatch {
  score: number;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  coverLetterTips: string[];
  source: 'ai' | 'keyword';
  model: string | null;
  eligibility: string[];
  notice?: string;
  cached: boolean;
  remainingToday?: number;
}

export interface Applicant {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  createdAt: string;
  nextStatuses: ApplicationStatus[];
  seeker: { id: string; name: string; email: string; seekerProfile: SeekerProfileFields | null };
}

export interface JobSummary {
  id: string;
  title: string;
  city: string;
  region: string;
  country: Country;
  status: JobStatus;
  workType: WorkType;
  company: { id: string; name: string };
}

export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  job: JobSummary;
}

export interface SavedJob extends JobSummary {
  savedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  usersByRole: Partial<Record<Role, number>>;
  jobsByStatus: Partial<Record<JobStatus, number>>;
  applicationsByStatus: Partial<Record<ApplicationStatus, number>>;
  last7Days: { newUsers: number; newApplications: number };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  suspended: boolean;
  createdAt: string;
  company: { name: string } | null;
}

export interface AdminJob extends JobBase {
  company: { name: string };
  _count: { applications: number };
}
