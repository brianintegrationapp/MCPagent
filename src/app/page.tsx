import { AuthTest } from "@/components/auth-test";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Overview",
};

export default function HomePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-4 mb-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              MCP Agent Example
            </h1>
            <p className="text-muted-foreground">
              This app uses{" "}
              <Link href="https://integration.app">Integration.app</Link>'s MCP Server with Hubspot to enable an embedded AI Agent with the ability to perform actions in the connected Hubspot CRM based on natural language input from the chat user.
            </p>
          </div>
        </div>
      </div>
      <AuthTest />
    </div>
  );
}
