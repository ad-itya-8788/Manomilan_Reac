import { useState } from "react";
import "./faq.css";

const FAQS = [
  {
    question: "1. What is Aaryans Manomilan?",
    answer: (
      <p>
        Aaryans Manomilan is a Jain matrimony and matchmaking platform that helps individuals and families connect with compatible prospective life partners. It combines community values and family involvement with online profiles, preferences, verification, and interest tools. Its purpose is to build meaningful connections: “इथे मनं मिळतात... आणि नाती जुळतात…”
      </p>
    ),
  },
  {
    question: "2. How do I create an account?",
    answer: (
      <>
        <p>
          Use Register or Sign Up to create a website account. To register for a Melava event, open Registration Plan &gt; Registration and start by searching your mobile number:
        </p>
        <ol>
          <li>Existing candidates can restore their saved details; new candidates continue to the registration form.</li>
          <li>Complete the required profile details and review the information.</li>
          <li>Follow the on-screen event and payment steps to submit the registration.</li>
        </ol>
      </>
    ),
  },
  {
    question: "3. Is there any fee for registration?",
    answer: (
      <p>
        Melava registration fees and any optional booklet charges depend on the selected event. The current amount is shown in the registration form. Payment proof is submitted for admin verification. Please contact us about the applicable payment and refund terms before paying; refunds are not guaranteed automatically.
      </p>
    ),
  },
  {
    question: "4. How do I search for matches?",
    answer: (
      <p>
        Sign in, complete your profile and partner preferences, then open Find Matches. The site uses your profile and preferences to show compatible profiles, with the available search and sorting controls on that page.
      </p>
    ),
  },
  {
    question: "5. How do I contact someone I'm interested in?",
    answer: (
      <p>
        Select Send Interest on a profile. You can track requests in Interests Sent, and the other member can respond from Interests Received. If an interest is accepted, families can discuss next steps; contact our team if you need help arranging a meeting. Sending an interest does not guarantee a match.
      </p>
    ),
  },
  {
    question: "6. Is my personal information safe?",
    answer: (
      <p>
        Yes. We prioritize your privacy and security. Your details are protected and shared only with users you choose to connect with. You can also control your profile visibility through settings.
      </p>
    ),
  },
  {
    question: "7. Can I hide or delete my profile?",
    answer: (
      <>
        <p>Yes, you can:</p>
        <ol>
          <li>Hide your profile temporarily if you are not actively searching</li>
          <li>Delete your profile permanently through the Account Settings section</li>
        </ol>
      </>
    ),
  },
  {
    question: "8. I forgot my password. What should I do?",
    answer: (
      <p>
        Select Forgot password? on the login page and follow the instructions. If the reset page does not open or you cannot regain access, contact support using your registered mobile number or email. Never share your password or OTP with anyone.
      </p>
    ),
  },
  {
    question: "9. How do I raise concerns about a profile?",
    answer: (
      <p>
        Contact our team by email or phone with the profile details and a brief description of your concern. We will review it and follow up as needed.
      </p>
    ),
  },
  {
    question: "10. Can I register on behalf of someone else?",
    answer: (
      <p>
        A parent or family member may help complete the registration, but the candidate should know about it and consent. Enter accurate details; the form includes a field to identify who is completing the profile.
      </p>
    ),
  },
  {
    question: "11. How can I contact customer support?",
    answer: (
      <>
        <p>Contact our Pune head office during office hours (10:00 AM to 5:30 PM):</p>
        <ol>
          <li>Email: <a href="mailto:aaryansmanomilan@gmail.com">aaryansmanomilan@gmail.com</a></li>
          <li>Phone: <a href="tel:+917030932526">7030932526</a></li>
        </ol>
      </>
    ),
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <main className="faq-page">
      <section className="faq-section">
        <div className="site-container">
          <div className="faq-content">
            <div className="faq-heading">
              <h1 className="sec-title">Frequently Asked Questions</h1>
              <p className="sec-sub">Find answers to common questions about Aaryans Manomilan</p>
            </div>

            <div className="faq-list">
              {FAQS.map((faq, index) => {
                const isOpen = index === activeIndex;
                const answerId = `faq-answer-${index}`;

                return (
                  <article className={`faq-item${isOpen ? " is-open" : ""}`} key={faq.question}>
                    <h2 className="faq-question-heading">
                      <button
                        type="button"
                        className="faq-question"
                        aria-expanded={isOpen}
                        aria-controls={answerId}
                        onClick={() => setActiveIndex(isOpen ? -1 : index)}
                      >
                        <span>{faq.question}</span>
                        <i className="bi bi-chevron-down" aria-hidden="true" />
                      </button>
                    </h2>
                    {isOpen && (
                      <div className="faq-answer" id={answerId}>
                        {faq.answer}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
