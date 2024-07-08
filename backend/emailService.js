const emailjs = require('emailjs-com');

emailjs.init(process.env.EMAILJS_USER_ID);

const sendEmail = (to, fullName, roomName, roomType, nights, bookingId, totalPrice) => {
  const templateParams = {
    to_name: fullName,
    to_email: to,
    roomName: roomName,
    roomType: roomType,
    nights: nights,
    bookingId: bookingId,
    totalPrice: totalPrice
  };

  emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    templateParams,
    process.env.EMAILJS_USER_ID
  ).then(
    (response) => {
      console.log('Email sent successfully:', response.status, response.text);
    },
    (error) => {
      console.error('Failed to send email:', error);
    }
  );
};

module.exports = sendEmail;