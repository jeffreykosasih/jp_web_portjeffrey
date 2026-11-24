import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faLinkedin } from '@fortawesome/free-brands-svg-icons';
import emailjs from '@emailjs/browser';
import { DeviceInfo } from '../lib/types';
import SideDrawer, { DrawerTitle, getDrawerDevice } from './SideDrawer';
import { LINKS, PROFILE } from '../lib/profile';

// Gmail mark
const GmailIcon = () => (
  <svg viewBox='0 0 24 24' width='1em' height='1em' fill='currentColor' aria-hidden='true'>
    <path d='M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z' />
  </svg>
);

interface ConnectPageProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  shouldAnimateText?: boolean;
  deviceInfo?: DeviceInfo;
  onPlayClickSound?: () => void;
}

const EMAILJS = {
  service: 'service_gc4w4xq',
  template: 'template_3gghxnp',
  publicKey: 'xikWb0cmK5mzktYbT',
};

type Field = 'name' | 'email' | 'message';

// Connect: three round buttons (LinkedIn, email, send a message). The
// message form only opens when asked for, so the drawer stays compact.
export default function ConnectPage({
  isVisible,
  onClose,
  isDarkMode,
  shouldAnimateText = true,
  deviceInfo,
  onPlayClickSound,
}: ConnectPageProps) {
  const device = getDrawerDevice(deviceInfo);
  const isPhone = device === 'mobile-portrait' || device === 'mobile-landscape';
  const brand = isDarkMode ? '#101c34' : '#0b3a73';

  const [showForm, setShowForm] = React.useState(false);
  const [toast, setToast] = React.useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({});
  const toastTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    emailjs.init(EMAILJS.publicKey);
  }, []);

  // Close the form whenever the drawer closes
  React.useEffect(() => {
    if (!isVisible) setShowForm(false);
  }, [isVisible]);

  const showToast = (kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  // Webmail users get nothing from mailto, so the address is copied too
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      showToast('ok', `Email copied: ${PROFILE.email}`);
    } catch {
      showToast('ok', PROFILE.email);
    }
  };

  const validate = () => {
    const next: Partial<Record<Field, string>> = {};
    if (formData.name.trim().length < 2) next.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      next.email = 'Please enter a valid email';
    if (formData.message.trim().length < 10)
      next.message = 'Message needs at least 10 characters';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      await emailjs.send(EMAILJS.service, EMAILJS.template, {
        name: formData.name,
        from_name: formData.name,
        from_email: formData.email,
        to_email: 'jeffreyko1998@gmail.com',
        message: formData.message,
        sent_date: now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        sent_time: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
      });
      showToast('ok', 'Message sent. Thank you!');
      setFormData({ name: '', email: '', message: '' });
      setShowForm(false);
    } catch (error) {
      console.error('EmailJS error:', error);
      showToast('error', 'Could not send. Please try again or email me.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as Field]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const size = isPhone ? 64 : 76;
  // Accent for fills and outlines: white by day, yellow at night
  const accent = isDarkMode ? '#ffd36b' : '#ffffff';
  const roundButton: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: 'var(--ui-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isPhone ? 24 : 28,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const buttons = [
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <FontAwesomeIcon icon={faLinkedin} />,
      href: LINKS.linkedin,
    },
    {
      key: 'email',
      label: 'Email',
      icon: <GmailIcon />,
      href: `mailto:${PROFILE.email}`,
      onClick: copyEmail,
    },
    {
      key: 'message',
      label: showForm ? 'Close form' : 'Message',
      icon: <FontAwesomeIcon icon={showForm ? faXmark : faPaperPlane} />,
      onClick: () => setShowForm((v) => !v),
      pressed: showForm,
    },
  ];

  const inputStyle = (field: Field): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.8rem 1rem',
    borderRadius: '0.75rem',
    // White by day, yellow at night (the drawer's line colour)
    border: `2px solid ${errors[field] ? '#ffd1d1' : 'var(--ui-line)'}`,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--ui-ink)',
    fontFamily: "'Baloo 2', sans-serif",
    fontSize: '1rem', // 16px stops iOS zooming in
    outline: 'none',
  });

  const errorText = (field: Field) =>
    errors[field] ? (
      <p role='alert' style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#ffe1e1' }}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <SideDrawer
      isVisible={isVisible}
      onClose={onClose}
      isDarkMode={isDarkMode}
      deviceInfo={deviceInfo}
      label='Connect'
      onPlayClickSound={onPlayClickSound}
    >
      <motion.div
        initial={shouldAnimateText ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.35 }}
      >
        <DrawerTitle
          title='Let’s Connect!'
          subtitle='Hiring, or want to build something together?'
          deviceInfo={deviceInfo}
        />

        {/* Three round buttons, labelled underneath */}
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: isPhone ? '1.5rem' : '2.25rem',
          }}
        >
          {buttons.map((b) => {
            const content = (
              <>
                <motion.span
                  whileHover={{ scale: 1.08, backgroundColor: accent, color: brand }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    ...roundButton,
                    ...(b.pressed ? { backgroundColor: accent, color: brand } : {}),
                  }}
                >
                  {b.icon}
                </motion.span>
                <span
                  style={{
                    marginTop: '0.5rem',
                    fontFamily: "'Baloo 2', sans-serif",
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--ui-ink)',
                  }}
                >
                  {b.label}
                </span>
              </>
            );
            const wrap: React.CSSProperties = {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'none',
            };
            return (
              <li key={b.key}>
                {b.href ? (
                  <a
                    href={b.href}
                    {...(b.href.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    onClick={() => {
                      onPlayClickSound?.();
                      b.onClick?.();
                    }}
                    aria-label={
                      b.key === 'email'
                        ? `Email ${PROFILE.email} (also copies the address)`
                        : `${b.label} (opens in a new tab)`
                    }
                    style={wrap}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      onPlayClickSound?.();
                      b.onClick?.();
                    }}
                    aria-expanded={b.pressed}
                    aria-controls='connect-form'
                    style={wrap}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Message form, revealed by the Message button */}
        <AnimatePresence initial={false}>
          {showForm && (
            <motion.form
              id='connect-form'
              key='form'
              onSubmit={handleSubmit}
              noValidate
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                maxWidth: '26rem',
                margin: '0 auto',
                paddingTop: isPhone ? '1.5rem' : '2rem',
              }}
            >
              <div>
                <input
                  name='name'
                  aria-label='Your name'
                  autoComplete='name'
                  placeholder='Your name'
                  value={formData.name}
                  onChange={onChange}
                  className='bright-placeholder'
                  style={inputStyle('name')}
                />
                {errorText('name')}
              </div>
              <div>
                <input
                  name='email'
                  type='email'
                  aria-label='Your email'
                  autoComplete='email'
                  placeholder='Your email'
                  value={formData.email}
                  onChange={onChange}
                  className='bright-placeholder'
                  style={inputStyle('email')}
                />
                {errorText('email')}
              </div>
              <div>
                <textarea
                  name='message'
                  aria-label='Your message'
                  placeholder='Your message'
                  rows={isPhone ? 3 : 4}
                  value={formData.message}
                  onChange={onChange}
                  className='bright-placeholder'
                  style={{ ...inputStyle('message'), resize: 'vertical' }}
                />
                {errorText('message')}
              </div>
              <button
                type='submit'
                disabled={isSubmitting}
                style={{
                  alignSelf: 'center',
                  minHeight: '2.75rem',
                  padding: '0 1.75rem',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: accent,
                  color: brand,
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: isSubmitting ? 'default' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Sending…' : 'Send message'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Status message (copied / sent / failed) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role='status'
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              position: 'fixed',
              left: '50%',
              bottom: '1.5rem',
              transform: 'translateX(-50%)',
              maxWidth: 'calc(100% - 2rem)',
              padding: '0.75rem 1.25rem',
              borderRadius: '999px',
              // Dark tones keep white text above 7:1
              backgroundColor: toast.kind === 'ok' ? '#14532d' : '#7f1d1d',
              color: 'var(--ui-ink)',
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700,
              fontSize: '0.9375rem',
              boxShadow: '0 0.5rem 1.5rem rgba(0, 0, 0, 0.3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </SideDrawer>
  );
}
