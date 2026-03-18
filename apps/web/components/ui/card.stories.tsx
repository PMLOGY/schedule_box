import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glass'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    style: { width: '360px' },
    children: (
      <CardContent>
        <p className="text-sm text-muted-foreground">This is a default card.</p>
      </CardContent>
    ),
  },
};

export const Glass: Story = {
  args: {
    variant: 'glass',
    style: { width: '360px' },
    children: (
      <CardContent>
        <p className="text-sm">This is a glassmorphism card.</p>
      </CardContent>
    ),
  },
};

export const WithHeader: Story = {
  name: 'With Header',
  args: {
    variant: 'default',
    style: { width: '360px' },
    children: (
      <>
        <CardHeader>
          <CardTitle>Nadpis karty</CardTitle>
          <CardDescription>Popis obsahu karty s detailnými informáciami.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Obsah karty s doplnkovými informáciami pre používateľa.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const GlassWithHeader: Story = {
  name: 'Glass With Header',
  args: {
    variant: 'glass',
    style: { width: '360px' },
    children: (
      <>
        <CardHeader>
          <CardTitle>Glass karta</CardTitle>
          <CardDescription>Glassmorphism karta so všetkými sekciami.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Obsah glass karty s plnou kompozíciou komponentov.</p>
        </CardContent>
        <CardFooter>
          <Button variant="glass-secondary" size="sm">
            Potvrdiť
          </Button>
          <Button variant="ghost" size="sm" className="ml-2">
            Zrušiť
          </Button>
        </CardFooter>
      </>
    ),
  },
};

export const FullComposition: Story = {
  name: 'Full Composition',
  args: {
    variant: 'default',
    style: { width: '360px' },
    children: (
      <>
        <CardHeader>
          <CardTitle>Rezervácia</CardTitle>
          <CardDescription>Detaily vašej rezervácie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dátum</span>
              <span>25. marca 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Čas</span>
              <span>10:00 - 11:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cena</span>
              <span className="font-semibold">50 €</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm">Potvrdiť</Button>
          <Button variant="outline" size="sm">
            Zrušiť
          </Button>
        </CardFooter>
      </>
    ),
  },
};
