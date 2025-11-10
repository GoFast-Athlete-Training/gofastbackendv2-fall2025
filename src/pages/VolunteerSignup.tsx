import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { activeVolunteerRoles } from '../data/volunteerRoles';
import { buildApiUrl } from '../lib/api';

type FormState = {
  name: string;
  email: string;
  roleId: string;
  note: string;
};

const defaultFormState: FormState = {
  name: '',
  email: '',
  roleId: activeVolunteerRoles[0]?.id ?? '',
  note: '',
};

const VolunteerSignup = () => {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setErrorMessage(null);
  };

  const resetForm = () => {
    setFormState(defaultFormState);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { name, email, roleId, note } = formState;
    if (!name.trim() || !email.trim() || !roleId.trim()) {
      setErrorMessage('Please fill in your name, email, and volunteer role.');
      return;
    }

    setIsSubmitting(true);
    setShowSuccess(false);
    setErrorMessage(null);

    try {
      const response = await fetch(buildApiUrl('/api/volunteer/input'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: roleId,
          note: note.trim() ? note.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Something went wrong while saving your signup. Please try again.';
        throw new Error(message);
      }

      resetForm();
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit your signup right now.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/40 to-white">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3 text-sm text-orange-600">
          <ArrowLeft className="h-4 w-4" />
          <Link to="/volunteer" className="font-semibold transition hover:text-orange-700">
            Back to overview
          </Link>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Volunteer Signup</p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Boys Gotta Run – Discovery 5K Helpers
          </h1>
          <p className="mt-4 text-base text-gray-600">
            Thank you for giving your time. Choose the role that fits, add any notes, and we’ll confirm assignments via
            email. No accounts, no extra steps—just sign up and we’ll be in touch.
          </p>

          {showSuccess && (
            <div className="mt-6 inline-flex w-full items-center gap-3 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-medium text-lime-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>Got it! You’re on the list. Thank you for supporting the team.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 inline-flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="volunteer-name" className="text-sm font-semibold text-gray-800">
                  Name<span className="text-orange-500">*</span>
                </label>
                <input
                  id="volunteer-name"
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleChange('name')}
                  placeholder="Full name"
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="volunteer-email" className="text-sm font-semibold text-gray-800">
                  Email<span className="text-orange-500">*</span>
                </label>
                <input
                  id="volunteer-email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleChange('email')}
                  placeholder="you@example.com"
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="volunteer-role" className="text-sm font-semibold text-gray-800">
                Volunteer Role<span className="text-orange-500">*</span>
              </label>
              <select
                id="volunteer-role"
                name="role"
                value={formState.roleId}
                onChange={handleChange('roleId')}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                required
              >
                {activeVolunteerRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="volunteer-note" className="text-sm font-semibold text-gray-800">
                Notes (optional)
              </label>
              <textarea
                id="volunteer-note"
                name="note"
                value={formState.note}
                onChange={handleChange('note')}
                rows={4}
                placeholder="Let us know about any preferences or questions."
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <Link
                to="/volunteer/roster"
                className="text-sm font-semibold text-gray-500 transition hover:text-orange-600"
              >
                View roster
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit Signup</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VolunteerSignup;


