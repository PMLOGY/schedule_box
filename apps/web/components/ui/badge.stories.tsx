import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'glass',
        'glass-blue',
        'glass-gray',
        'glass-red',
        'glass-amber',
        'glass-green',
      ],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Chyba',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
};

export const Glass: Story = {
  args: {
    children: 'Glass',
    variant: 'glass',
  },
};

export const GlassBlue: Story = {
  name: 'Glass Blue',
  args: {
    children: 'Aktívny',
    variant: 'glass-blue',
  },
};

export const GlassGray: Story = {
  name: 'Glass Gray',
  args: {
    children: 'Neaktívny',
    variant: 'glass-gray',
  },
};

export const GlassRed: Story = {
  name: 'Glass Red',
  args: {
    children: 'Zrušené',
    variant: 'glass-red',
  },
};

export const GlassAmber: Story = {
  name: 'Glass Amber',
  args: {
    children: 'Čakajúci',
    variant: 'glass-amber',
  },
};

export const GlassGreen: Story = {
  name: 'Glass Green',
  args: {
    children: 'Dokončené',
    variant: 'glass-green',
  },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="glass">Glass</Badge>
      <Badge variant="glass-blue">Glass Blue</Badge>
      <Badge variant="glass-gray">Glass Gray</Badge>
      <Badge variant="glass-red">Glass Red</Badge>
      <Badge variant="glass-amber">Glass Amber</Badge>
      <Badge variant="glass-green">Glass Green</Badge>
    </div>
  ),
};
