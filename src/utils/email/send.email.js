import nodeMailer from "nodemailer"


export const subjectTypes = {
    confirmEmail: "Confirm-Email",
    resetPassword: "Forget-Password",
    updateEmail: "Update-Email",
    shareProfile: "Views",
    twoStepVerification: "2-Step-Verification",
};
export const sendEmail = async ({ to = [], cc = [], bcc = [], subject = "Route", text = "", html = "", attachments = [] } = {}) => {


    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const info = await transporter.sendMail({
        from: `"Jop Search App" <${process.env.EMAIL}>`,
        to,
        subject,
        text,
        html,
        attachments
    });

    console.log("Message sent: %s", info.messageId);


}

