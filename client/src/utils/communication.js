import api from '../services/api';

/**
 * Trigger WhatsApp redirect
 * @param {string} number - Parent mobile number
 * @param {string} message - Prefilled message
 * @param {object} logData - Optional data to log in the database
 */
export const sendWhatsApp = async (number, message, logData = null) => {
  const cleanNumber = number.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://wa.me/${cleanNumber.startsWith('91') ? cleanNumber : '91' + cleanNumber}?text=${encodedMsg}`;
  
  if (logData) {
    try {
      await api.logNotification({
        ...logData,
        type: 'WhatsApp',
        recipient_number: number,
        message
      });
    } catch (e) { console.error('Logging failed', e); }
  }
  
  window.open(url, '_blank');
};

/**
 * Trigger SMS redirect
 * @param {string} number - Parent mobile number
 * @param {string} message - Prefilled message
 * @param {object} logData - Optional data to log in the database
 */
export const sendSMS = async (number, message, logData = null) => {
  const cleanNumber = number.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  // Using sms: protocol. Note: separator can be ? or & depending on OS, but ?body= is standard for most.
  const url = `sms:${cleanNumber}?body=${encodedMsg}`;
  
  if (logData) {
    try {
      await api.logNotification({
        ...logData,
        type: 'SMS',
        recipient_number: number,
        message
      });
    } catch (e) { console.error('Logging failed', e); }
  }
  
  window.location.href = url;
};

/**
 * Trigger Phone Call redirect
 * @param {string} number - Parent mobile number
 * @param {number} studentId - Optional student ID for logging
 */
export const makeCall = (number) => {
  const cleanNumber = number.replace(/\D/g, '');
  window.location.href = `tel:${cleanNumber}`;
};

/**
 * Message Templates
 */
export const templates = {
  absent: (name) => `Your child ${name} was absent today in tuition.`,
  feeReminder: (month, dueDate) => `Fee payment for ${month} is pending. Please pay before the due date: ${dueDate}.`,
  marksReport: (name, marks) => {
    const marksStr = marks.map(m => `${m.subject}: ${m.obtained}/${m.total}`).join(', ');
    return `Marks Report for ${name}: ${marksStr}`;
  }
};
