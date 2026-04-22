import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../app/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('exibe "VAI" para status going', () => {
    render(<StatusBadge status="going" />);
    expect(screen.getByText('VAI')).toBeInTheDocument();
  });

  it('exibe "NÃO VAI" para status absent', () => {
    render(<StatusBadge status="absent" />);
    expect(screen.getByText('NÃO VAI')).toBeInTheDocument();
  });

  it('exibe "PENDENTE" para status pending', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('PENDENTE')).toBeInTheDocument();
  });
});
