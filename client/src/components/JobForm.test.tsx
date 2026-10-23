import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Meta } from '../types';
import JobForm from './JobForm';

const meta: Meta = {
  categories: ['Software Engineering', 'Healthcare'],
  countries: { AU: 'Australia', NZ: 'New Zealand' },
  locations: { AU: { NSW: 'New South Wales', VIC: 'Victoria' }, NZ: { AKL: 'Auckland', WGN: 'Wellington' } },
  workTypes: { FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACT: 'Contract / temp', CASUAL: 'Casual / vacation' },
  workplaces: { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' },
  workRights: {
    CITIZEN_PR: 'Citizen or permanent resident',
    WORKING_HOLIDAY: 'Working holiday visa',
    STUDENT: 'Student visa',
    TEMPORARY_VISA: 'Other temporary visa with work rights',
    REQUIRES_SPONSORSHIP: 'Requires visa sponsorship',
  },
  applicationStatuses: {
    APPLIED: 'Applied',
    REVIEWING: 'Under review',
    INTERVIEW: 'Interview',
    OFFERED: 'Offered',
    REJECTED: 'Unsuccessful',
    WITHDRAWN: 'Withdrawn',
  },
};

function setup() {
  const onSubmit = vi.fn();
  render(<JobForm meta={meta} onSubmit={onSubmit} submitLabel="Publish" />);
  return { onSubmit, user: userEvent.setup() };
}

async function fillValidJob(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Job title'), 'Junior Developer');
  await user.selectOptions(screen.getByLabelText('Category'), 'Software Engineering');
  await user.selectOptions(screen.getByLabelText('State / territory'), 'VIC');
  await user.type(screen.getByLabelText('City / suburb'), 'Melbourne');
  await user.type(screen.getByLabelText('Description'), 'Build and maintain React applications with our team.');
}

describe('JobForm', () => {
  it('requires the core fields', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Enter a job title')).toBeInTheDocument();
    expect(screen.getByText('Choose a category')).toBeInTheDocument();
    expect(screen.getByText('Choose a location')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a salary range where the maximum is below the minimum', async () => {
    const { onSubmit, user } = setup();
    await fillValidJob(user);
    await user.type(screen.getByLabelText(/salary from/i), '90000');
    await user.type(screen.getByLabelText(/salary to/i), '80000');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(screen.getByText('Maximum must be at least the minimum')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('switches region options with the country and resets the selection', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('State / territory'), 'NSW');
    await user.selectOptions(screen.getByLabelText('Country'), 'NZ');
    const region = screen.getByLabelText('Region');
    expect(region).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Auckland' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Victoria' })).not.toBeInTheDocument();
  });

  it('submits a clean payload with parsed salaries', async () => {
    const { onSubmit, user } = setup();
    await fillValidJob(user);
    await user.type(screen.getByLabelText(/salary from/i), '85,000');
    await user.click(screen.getByLabelText(/visa sponsorship/i));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Junior Developer',
      description: 'Build and maintain React applications with our team.',
      category: 'Software Engineering',
      country: 'AU',
      region: 'VIC',
      city: 'Melbourne',
      workType: 'FULL_TIME',
      workplace: 'ONSITE',
      salaryMin: 85000,
      salaryMax: null,
      sponsorship: true,
    });
  });
});
