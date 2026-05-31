export function evaluatePasswordStrength(password, t) {
  if (!password) {
    return { score: 0, feedback: [] };
  }

  const feedback = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push(t('users.form.passwordRequirement.length'));
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push(t('users.form.passwordRequirement.case'));
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push(t('users.form.passwordRequirement.number'));
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push(t('users.form.passwordRequirement.special'));
  }

  return { score, feedback };
}

export function passwordStrengthBarClass(score) {
  if (score === 0) return 'bg-slate-200 dark:bg-slate-700';
  if (score === 1) return 'bg-red-500';
  if (score === 2) return 'bg-orange-500';
  if (score === 3) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function passwordStrengthLabel(score, t) {
  if (score === 0) return '';
  if (score === 1) return t('users.form.passwordStrength.veryWeak');
  if (score === 2) return t('users.form.passwordStrength.weak');
  if (score === 3) return t('users.form.passwordStrength.medium');
  return t('users.form.passwordStrength.strong');
}
