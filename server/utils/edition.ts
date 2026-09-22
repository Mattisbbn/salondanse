export function assertRegistrationOpen(edition: {
  isRegistrationOpen: boolean
  registrationStartDate: Date | null
  registrationEndDate: Date | null
}) {
  const now = new Date()

  if (!edition.isRegistrationOpen) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La période d\'inscription est fermée. Le planning est actuellement en consultation seule.'
    })
  }

  if (edition.registrationStartDate && now < edition.registrationStartDate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La période d\'inscription est fermée. Le planning est actuellement en consultation seule.'
    })
  }

  if (edition.registrationEndDate && now > edition.registrationEndDate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La période d\'inscription est fermée. Le planning est actuellement en consultation seule.'
    })
  }
}
