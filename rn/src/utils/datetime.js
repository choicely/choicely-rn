export const getFormattedHoursMinutes = date => {
  try {
    const dateObject = new Date(date)
    const hours = dateObject.getHours()
    const minutes = dateObject.getMinutes()

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch (error) {
    return '00:00'
  }
}

export const getFormattedDate = date => {
  try {
    const dateObject = new Date(date)
    const day = dateObject.getDate().toString().padStart(2, '0')
    const month = dateObject.toLocaleString('en-GB', { month: 'short' })
    const year = dateObject.getFullYear()

    return `${day} ${month} ${year}`
  } catch (error) {
    return ''
  }
}
