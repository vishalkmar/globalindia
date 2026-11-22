"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog, Drawer } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Checkbox, Field, Input, RadioGroup, Select, Textarea } from "@/components/ui/Field";
import { FileDrop } from "@/components/ui/FileDrop";
import { SectionHeading } from "@/components/ui/Layout";
import { Accordion, Tabs } from "@/components/ui/Tabs";

export function StyleguideInteractive() {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const toast = useToast();

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-8">
        <SectionHeading eyebrow="07 Forms" title="Inputs" />
        <form className="grid gap-6 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <Field label="Your name" required>
            <Input name="name" autoComplete="name" placeholder="Rakesh Sharma" />
          </Field>
          <Field label="Company" hint="Optional, helps us prepare the right paperwork">
            <Input name="company" autoComplete="organization" />
          </Field>
          <Field label="Email" error="Enter a valid email address, for example name@company.in">
            <Input name="email" type="email" defaultValue="rakesh@" />
          </Field>
          <Field label="Pack size">
            <Select name="pack" defaultValue="">
              <option value="" disabled>
                Choose a pack size
              </option>
              <option>25 kg bag</option>
              <option>50 kg bag</option>
              <option>200 L drum</option>
            </Select>
          </Field>
          <Field label="Requirement" className="md:col-span-2">
            <Textarea name="message" placeholder="Product, grade, monthly quantity and delivery city" />
          </Field>
          <RadioGroup
            legend="Preferred contact"
            name="contact"
            inline
            defaultValue="phone"
            options={[
              { value: "phone", label: "Phone call" },
              { value: "email", label: "Email" },
              { value: "whatsapp", label: "WhatsApp" },
            ]}
          />
          <Checkbox label="Send me a sample first" description="Samples are available for most products." />
          <FileDrop
            className="md:col-span-2"
            accept={["image/jpeg", "image/png", "image/webp", "application/pdf"]}
            maxBytes={5 * 1024 * 1024}
          />
        </form>
      </div>

      <div className="flex flex-col gap-8">
        <SectionHeading eyebrow="08 Overlays" title="Dialog, drawer and toast" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Open drawer
          </Button>
          <Button variant="ghost" onClick={() => toast.success("Product saved and published.")}>
            Success toast
          </Button>
          <Button variant="ghost" onClick={() => toast.error("Upload failed: file is over 5 MB.")}>
            Error toast
          </Button>
        </div>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Request a callback"
          description="We call back within working hours, Monday to Saturday."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(false)}>Request callback</Button>
            </>
          }
        >
          <Field label="Phone number" required>
            <Input type="tel" autoComplete="tel" placeholder="+91" />
          </Field>
        </Dialog>
        <Drawer open={drawer} onClose={() => setDrawer(false)} title="Menu">
          <p className="text-muted">
            Drawer content. Esc or the close button closes it; focus returns to the button.
          </p>
        </Drawer>
      </div>

      <div className="flex flex-col gap-8">
        <SectionHeading eyebrow="09 Disclosure" title="Tabs and accordion" />
        <Tabs
          label="Product families"
          tabs={[
            {
              id: "food",
              label: "Food ingredients",
              content: (
                <p className="text-muted">
                  Xanthan gum, malic acid, citric acid, sodium citrate, MSG, maltodextrin.
                </p>
              ),
            },
            {
              id: "care",
              label: "Personal care bases",
              content: (
                <p className="text-muted">Light liquid paraffin, glycerine, CAPB, shampoo and soap bases.</p>
              ),
            },
            {
              id: "detergent",
              label: "Detergent raw materials",
              content: (
                <p className="text-muted">SLES, LABSA, AOS, SLS, acid thickeners and foam boosters.</p>
              ),
            },
          ]}
        />
        <Accordion
          items={[
            {
              id: "moq",
              title: "What is your minimum order?",
              content: "For most products 50 kg or 50 L. A few items such as soap bases start at 25 kg.",
            },
            {
              id: "outside",
              title: "Do you supply outside Delhi?",
              content:
                "Yes. We dispatch across India by road transport and can arrange FOB for export enquiries.",
            },
            {
              id: "sample",
              title: "Can I get a sample first?",
              content: "Samples are available for most products. Mention it in your enquiry.",
            },
          ]}
        />
      </div>
    </div>
  );
}
