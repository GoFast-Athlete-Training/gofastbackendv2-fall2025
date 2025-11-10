import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Medal, Map } from 'lucide-react';
import { volunteerRoles } from '../data/volunteerRoles';

const stravaRouteUrl = 'https://www.strava.com/routes/3271529398161661558';

const VolunteerOverview = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-10">
        <header className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-500">Volunteer Crew</p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            🏃‍♂️ Boys Gotta Run – Discovery 5K (Final Run)
          </h1>
          <p className="mt-4 max-w-2xl text-base text-gray-600">
            It’s the final week of our Boys Gotta Run season. We’re keeping it low-key, warm, and all about the kids.
            Thank you for helping us send them off with cheers, high-fives, and a finish they’ll remember.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/volunteer/signup"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              <span>Sign Up to Help</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={stravaRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-orange-200 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2"
            >
              <Map className="h-4 w-4" />
              <span>View 5K Course Map</span>
            </a>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm">
            <CalendarDays className="h-6 w-6 text-orange-500" />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-orange-600">Date & Time</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">Wednesday, November 12, 2025 – 7:55 AM</p>
            <p className="mt-3 text-sm text-gray-600">
              Meet at our normal spot, do a 10-minute warm-up, then start the 5K course together.
            </p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-sky-50/60 p-6 shadow-sm">
            <MapPin className="h-6 w-6 text-sky-500" />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-sky-600">Location</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">Discovery Elementary</p>
            <p className="mt-3 text-sm text-gray-600">
              5275 N 36th St, Arlington, VA 22207
            </p>
          </div>
          <div className="rounded-3xl border border-lime-100 bg-lime-50/60 p-6 shadow-sm">
            <Medal className="h-6 w-6 text-lime-500" />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-lime-600">Tone</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">Supportive & Celebratory</p>
            <p className="mt-3 text-sm text-gray-600">
              This isn’t a public race. It’s our team’s victory lap. Keep the vibes easy, encouraging, and fun.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Volunteer Roles</p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900">Where We Need You</h2>
              <p className="mt-3 max-w-2xl text-sm text-gray-600">
                Pick the role that fits best. We’re focusing on guiding, pacing, and celebrating our runners. Optional
                future roles are noted below for reference.
              </p>
            </div>
            <Link
              to="/volunteer/signup"
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-orange-600 transition hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <ArrowRight className="h-3 w-3" />
              <span>Volunteer Signup</span>
            </Link>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">
                    Description
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-left font-semibold text-gray-600 sm:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {volunteerRoles.map((role) => (
                  <tr key={role.id} className="transition hover:bg-orange-50/50">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{role.name}</p>
                      {role.slots && <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{role.slots}</p>}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{role.description}</td>
                    <td className="hidden px-4 py-4 text-sm sm:table-cell">
                      {role.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime-700">
                          Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Optional (Future)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900">Thank you for being part of the finish-line crew.</h3>
          <p className="mt-3 text-sm text-gray-600">
            Volunteers make this final run special. Bring your best energy and a warm smile—we’ll take care of the rest.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              to="/volunteer/signup"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              <span>Sign Up to Help</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/volunteer/roster"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-orange-200 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2"
            >
              <span>View Volunteer Roster</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VolunteerOverview;


