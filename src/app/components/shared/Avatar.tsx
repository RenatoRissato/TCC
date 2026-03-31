import { StudentStatus } from '../../data/mockData';

const borderColors: Record<StudentStatus, string> = {
  going:   '#198754',
  absent:  '#ADB5BD',
  pending: '#FD7E14',
};
const bgColors: Record<StudentStatus, string> = {
  going:   '#E8F5E9',
  absent:  '#F5F5F5',
  pending: '#FFF3CD',
};
const textColors: Record<StudentStatus, string> = {
  going:   '#198754',
  absent:  '#868E96',
  pending: '#C56A00',
};

interface AvatarProps {
  initials: string;
  status?: StudentStatus;
  size?: number;
  badge?: string | number;
}

export function Avatar({ initials, status = 'going', size = 48, badge }: AvatarProps) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bgColors[status],
          border: `2.5px solid ${borderColors[status]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.28,
          fontWeight: 700,
          color: textColors[status],
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      {badge !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            background: '#212529',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
