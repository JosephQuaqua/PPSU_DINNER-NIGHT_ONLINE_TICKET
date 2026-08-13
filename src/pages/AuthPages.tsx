import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
} from 'lucide-react';

import {
  useForm,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  supabase,
} from '@/lib/supabase/client';

import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type SignInValues,
  type SignUpValues,
} from '@/lib/validation/schemas';


/* =========================================================
   AUTH SHELL
========================================================= */

function AuthShell({
  children,
  title,
  eyebrow,
}: {
  children: ReactNode;
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-[0.9fr_1.1fr]">

      {/* LEFT SIDE */}
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">

        <img
          src="https://images.pexels.com/photos/14646741/pexels-photo-14646741.jpeg?auto=compress&cs=tinysrgb&w=1400&h=1800&fit=crop"
          alt="Elegant PPSU event hall"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/25 to-navy-950/40" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">

          <Link
            to="/"
            className="text-sm font-bold tracking-[0.2em]"
          >
            PPSU EVENTS
          </Link>

          <div>
            <p className="section-label text-gold-200">
              {eyebrow}
            </p>

            <p className="mt-5 max-w-md font-display text-5xl leading-tight">
              Experience more. Connect more. Celebrate more.
            </p>
          </div>

          <p className="text-xs text-white/45">
            P. P. Savani University · Surat
          </p>

        </div>
      </div>


      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 py-12">

        <div className="w-full max-w-md">

          <Link
            to="/"
            className="mb-12 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-navy-950"
          >
            <ArrowLeft size={16} />
            Back to PPSU Events
          </Link>

          <p className="section-label">
            {eyebrow}
          </p>

          <h1 className="mt-4 font-display text-5xl leading-tight text-navy-950">
            {title}
          </h1>

          {children}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   FIELD
========================================================= */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

function Field({
  label,
  error,
  ...inputProps
}: FieldProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-semibold text-navy-950">
        {label}
      </span>

      <input
        {...inputProps}
        className={`input-field ${
          error
            ? 'border-red-400 focus:border-red-500'
            : ''
        }`}
      />

      {error ? (
        <span className="mt-1.5 block text-xs text-red-600">
          {error}
        </span>
      ) : null}

    </label>
  );
}


/* =========================================================
   SIGN IN PAGE
========================================================= */

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  const submit = async (values: SignInValues) => {
    setServerError('');

    console.log('SIGN IN VALUES:', values);

    const {
      error,
    } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      console.error('SIGN IN ERROR:', error);

      if (
        error.message.toLowerCase().includes('invalid')
      ) {
        setServerError(
          'The email or password is incorrect.'
        );
      } else {
        setServerError(error.message);
      }

      return;
    }


    const redirect = new URLSearchParams(
      location.search
    ).get('redirect');


    navigate(
      redirect || '/dashboard',
      {
        replace: true,
      }
    );
  };


  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your next experience awaits."
    >

      <form
  onSubmit={form.handleSubmit(
    submit,
    (errors) => {
      console.log('SIGN IN VALIDATION ERRORS:', errors);
      console.log('SIGN IN FORM VALUES:', form.getValues());
    }
  )}
  className="mt-10 space-y-5"
>

        {/* EMAIL */}
        <label className="block">
  <span className="mb-2 block text-sm font-semibold text-navy-950">
    PPSU email
  </span>

  <input
    type="email"
    placeholder="you@ppsu.ac.in"
    autoComplete="email"
    className={`input-field ${
      form.formState.errors.email
        ? 'border-red-400 focus:border-red-500'
        : ''
    }`}
    {...form.register('email')}
  />

  {form.formState.errors.email ? (
    <span className="mt-1.5 block text-xs text-red-600">
      {form.formState.errors.email.message}
    </span>
  ) : null}
</label>


        {/* PASSWORD */}
        <label className="block">

          <div className="mb-2 flex items-center justify-between">

            <span className="text-sm font-semibold text-navy-950">
              Password
            </span>

            <Link
              className="text-xs font-semibold text-gold-600 hover:text-gold-500"
              to="/forgot-password"
            >
              Forgot password?
            </Link>

          </div>


          <div className="relative">

            <input
              className={`input-field pr-12 ${
                form.formState.errors.password
                  ? 'border-red-400 focus:border-red-500'
                  : ''
              }`}
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              {...form.register('password')}
            />


            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              className="absolute right-4 top-3.5 text-muted"
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>

          </div>


          {form.formState.errors.password ? (
            <span className="mt-1.5 block text-xs text-red-600">
              {
                form.formState.errors.password
                  .message
              }
            </span>
          ) : null}

        </label>


        {/* SERVER ERROR */}
        {serverError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}


        {/* SUBMIT */}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {form.formState.isSubmitting
            ? 'Signing in…'
            : 'Sign in'}

          <ArrowRight size={16} />
        </button>


        {/* REGISTER */}
        <p className="text-center text-sm text-muted">
          New to PPSU Events?{' '}

          <Link
            className="font-semibold text-navy-950 hover:text-gold-600"
            to="/sign-up"
          >
            Create your account
          </Link>
        </p>

      </form>

    </AuthShell>
  );
}


/* =========================================================
   SIGN UP PAGE
========================================================= */

export function SignUpPage() {
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),

    defaultValues: {
      full_name: '',
      student_id: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });


  const submit = async (values: SignUpValues) => {
    setServerError('');

    console.log('SIGN UP VALUES:', values);


    const {
      error,
    } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,

      options: {
        data: {
          full_name: values.full_name,
          student_id: values.student_id,
        },
      },
    });


    if (error) {
      console.error('SIGN UP ERROR:', error);

      if (
        error.message
          .toLowerCase()
          .includes('already')
      ) {
        setServerError(
          'An account with this email already exists.'
        );
      } else {
        setServerError(error.message);
      }

      return;
    }


    navigate('/dashboard', {
      replace: true,
    });
  };


  return (
    <AuthShell
      eyebrow="Join the community"
      title="Make your next memory count."
    >

      <form
        onSubmit={form.handleSubmit(submit)}
        className="mt-10 space-y-4"
      >

        <Field
          label="Full name"
          placeholder="Your full name"
          autoComplete="name"
          {...form.register('full_name')}
          error={
            form.formState.errors.full_name?.message
          }
        />


        <Field
          label="Student ID"
          placeholder="PPSU student ID"
          autoComplete="username"
          {...form.register('student_id')}
          error={
            form.formState.errors.student_id?.message
          }
        />


        <Field
          label="PPSU email"
          type="email"
          placeholder="you@ppsu.ac.in"
          autoComplete="email"
          {...form.register('email')}
          error={
            form.formState.errors.email?.message
          }
        />


        <Field
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          autoComplete="new-password"
          {...form.register('password')}
          error={
            form.formState.errors.password?.message
          }
        />


        <Field
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
          error={
            form.formState.errors.confirmPassword?.message
          }
        />


        {serverError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}


        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {form.formState.isSubmitting
            ? 'Creating account…'
            : 'Create account'}

          <ArrowRight size={16} />
        </button>


        <p className="text-center text-sm text-muted">
          Already have an account?{' '}

          <Link
            className="font-semibold text-navy-950 hover:text-gold-600"
            to="/sign-in"
          >
            Sign in
          </Link>
        </p>

      </form>

    </AuthShell>
  );
}


/* =========================================================
   FORGOT PASSWORD PAGE
========================================================= */

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),

    defaultValues: {
      email: '',
    },
  });


  const submit = async (
    values: ForgotPasswordValues
  ) => {
    setServerError('');


    const {
      error,
    } = await supabase.auth.resetPasswordForEmail(
      values.email
    );


    if (error) {
      console.error(
        'PASSWORD RESET ERROR:',
        error
      );

      setServerError(
        'Unable to send the reset email. Please try again.'
      );

      return;
    }


    setSent(true);
  };


  return (
    <AuthShell
      eyebrow="Reset access"
      title="A fresh start is close."
    >

      {sent ? (
        <div className="mt-10 rounded-2xl bg-emerald-50 p-6 text-emerald-800">

          <LockKeyhole size={22} />

          <p className="mt-4 font-semibold">
            Check your PPSU inbox
          </p>

          <p className="mt-2 text-sm leading-6">
            If an account exists for that email,
            you will receive a link to reset your
            password.
          </p>

          <Link
            to="/sign-in"
            className="mt-5 inline-block text-sm font-bold"
          >
            Return to sign in
          </Link>

        </div>
      ) : (

        <form
          onSubmit={form.handleSubmit(submit)}
          className="mt-10 space-y-5"
        >

          <Field
            label="PPSU email"
            type="email"
            placeholder="you@ppsu.ac.in"
            autoComplete="email"
            {...form.register('email')}
            error={
              form.formState.errors.email?.message
            }
          />


          {serverError ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </p>
          ) : null}


          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting
              ? 'Sending…'
              : 'Send reset link'}

            <ArrowRight size={16} />
          </button>


          <p className="text-center text-sm text-muted">

            <Link
              className="font-semibold text-navy-950"
              to="/sign-in"
            >
              Back to sign in
            </Link>

          </p>

        </form>

      )}

    </AuthShell>
  );
}