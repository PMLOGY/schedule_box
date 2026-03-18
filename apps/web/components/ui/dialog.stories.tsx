import type { Meta, StoryObj } from '@storybook/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { Button } from './button';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default Dialog',
  args: {
    open: true,
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potvrdenie akcie</DialogTitle>
          <DialogDescription>
            Ste si istí, že chcete vykonať túto akciu? Táto akcia je nevratná.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Zrušiť</Button>
          <Button>Potvrdiť</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const WithForm: Story = {
  name: 'Dialog With Form',
  args: {
    open: true,
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nová rezervácia</DialogTitle>
          <DialogDescription>Vyplňte formulár pre vytvorenie novej rezervácie.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Meno zákazníka</label>
            <input
              type="text"
              placeholder="Ján Novák"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dátum</label>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Čas</label>
            <input
              type="time"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Zrušiť</Button>
          <Button>Vytvoriť rezerváciu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const GlassOverlay: Story = {
  name: 'Glass Overlay Dialog',
  args: {
    open: true,
  },
  parameters: {
    backgrounds: {
      default: 'gradient',
    },
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogContent className="glass-surface-heavy">
        <DialogHeader>
          <DialogTitle className="text-white">Glass Dialog</DialogTitle>
          <DialogDescription className="text-white/70">
            Tento dialóg používa glassmorphism štýlovanie pre premium vzhľad.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-white/80">
          Obsah dialógu s glass efektom a frosted glass pozadím.
        </div>
        <DialogFooter>
          <Button variant="glass-ghost">Zrušiť</Button>
          <Button variant="glass-secondary">Potvrdiť</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Destructive: Story = {
  name: 'Destructive Action Dialog',
  args: {
    open: true,
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vymazať záznam</DialogTitle>
          <DialogDescription>
            Táto akcia je nevratná. Záznam bude trvalo vymazaný zo systému.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Zrušiť</Button>
          <Button variant="destructive">Vymazať</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
