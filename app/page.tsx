"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  const testimonials = [
    {
      name: "Sarah Chen",
      handle: "@sarahchen",
      text: "Generated $12k in revenue last month through TikTok with AI TikTokz. The done-for-you service is incredible!",
    },
    {
      name: "Mike Torres",
      handle: "@miketorres",
      text: "Best investment I've made for my business. The warmed accounts get real reach from day one.",
    },
    {
      name: "Jessica Park",
      handle: "@jesspark",
      text: "Finally, TikTok marketing that actually works. No time wasted, just results.",
    },
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "$299",
      period: "per month",
      features: [
        "1 warmed TikTok account",
        "5 posts per week",
        "Basic analytics",
        "Email support",
      ],
      popular: false,
    },
    {
      name: "Growth",
      price: "$599",
      period: "per month",
      features: [
        "2 warmed TikTok accounts",
        "10 posts per week",
        "Advanced analytics",
        "Priority support",
        "Custom content strategy",
      ],
      popular: true,
    },
    {
      name: "Scale",
      price: "$1,199",
      period: "per month",
      features: [
        "5 warmed TikTok accounts",
        "25 posts per week",
        "Premium analytics",
        "Dedicated account manager",
        "Custom content strategy",
        "Monthly strategy calls",
      ],
      popular: false,
    },
  ];

  const faqs = [
    {
      id: "what-is",
      question: "What is AI TikTokz?",
      answer:
        "AI TikTokz is a done-for-you TikTok marketing service. We provide warmed TikTok accounts, create AI-powered content tailored to your business, and handle all posting. You just provide your business link and watch the traffic grow.",
    },
    {
      id: "warmed-accounts",
      question: "What does 'warmed account' mean?",
      answer:
        "A warmed account is a TikTok account that has been actively used (scrolling, engaging, building watch time) for weeks before posting. This signals to TikTok's algorithm that it's a real, engaged user, leading to better reach from the start.",
    },
    {
      id: "content-type",
      question: "What kind of content do you create?",
      answer:
        "We create high-engagement slideshow videos and educational listicles tailored to your business. These formats are proven to drive traffic while feeling authentic (not like AI-generated content). Each video subtly promotes your business link.",
    },
    {
      id: "how-long",
      question: "How long until I see results?",
      answer:
        "Most clients see their first viral post within 2-4 weeks. However, TikTok is algorithm-based, so results vary. We optimize content weekly based on performance data to maximize your reach and conversions.",
    },
    {
      id: "own-account",
      question: "Can I use my own TikTok account?",
      answer:
        "We recommend using our warmed accounts for best results. If your account is new or has low engagement, it won't get the reach needed. However, if you have an established account with good engagement, we can discuss using it.",
    },
    {
      id: "cancel",
      question: "Can I cancel anytime?",
      answer:
        "Yes! All plans are month-to-month. You can cancel anytime from your dashboard. If you cancel, we'll continue posting through the end of your billing period.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-4">
            Over 100M+ views generated for our clients
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="text-white">Automate TikToks that</span>
            <br />
            <span className="text-pink-500">drive traffic to your website</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Done-for-you TikTok marketing. We provide warmed accounts, create
            AI-powered content, and handle all posting. You just share your
            link.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="bg-white text-black hover:bg-gray-200 font-semibold px-8 py-6 text-lg"
            >
              {isLoading ? "Redirecting…" : "Get Started"}
            </Button>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-6 text-lg"
            >
              Watch Demo
            </Button>
          </div>

          <p className="text-sm text-gray-400 pt-2">
            100+ businesses using AI TikTokz to grow
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <Card
                key={idx}
                className="p-6 bg-black border border-white/10 space-y-4"
              >
                <p className="text-white text-sm leading-relaxed">
                  "{testimonial.text}"
                </p>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.handle}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold">
            Wait, it can really automate TikTok?
          </h2>
          <p className="text-xl text-gray-300">
            Yes! All content below was 100% created & published with AI TikTokz
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { views: "35.1M", likes: "5.8M" },
              { views: "25.6M", likes: "2.3M" },
              { views: "20.5M", likes: "2.6M" },
              { views: "20.0M", likes: "3.9M" },
              { views: "11.6M", likes: "1.0M" },
              { views: "9.7M", likes: "913K" },
              { views: "7.7M", likes: "267K" },
              { views: "7.5M", likes: "1.1M" },
            ].map((stat, idx) => (
              <Card
                key={idx}
                className="p-6 bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors"
              >
                <div className="aspect-[9/16] bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg mb-3"></div>
                <p className="text-2xl font-bold text-white">{stat.views}</p>
                <p className="text-sm text-gray-400">{stat.likes} likes</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold">1. Share Your Business</h3>
              <p className="text-gray-300">
                Tell us about your business and share your website or booking
                link. That's all we need to get started.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold">2. We Create Content</h3>
              <p className="text-gray-300">
                Our AI generates high-engagement TikToks tailored to your
                business. Educational, authentic, and optimized for virality.
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold">3. Watch Traffic Grow</h3>
              <p className="text-gray-300">
                We post consistently from warmed accounts. You get analytics,
                viral reach, and traffic to your site.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, idx) => (
              <Card
                key={idx}
                className={`p-8 space-y-6 relative ${
                  tier.popular
                    ? "bg-white text-black border-white"
                    : "bg-black border-white/10"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-pink-500 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{tier.price}</span>
                    <span
                      className={
                        tier.popular ? "text-gray-600" : "text-gray-400"
                      }
                    >
                      {tier.period}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleGoogleSignup}
                  className={`w-full font-semibold py-6 ${
                    tier.popular
                      ? "bg-black text-white hover:bg-gray-800"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  Get Started
                </Button>
                <ul className="space-y-3">
                  {tier.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          tier.popular ? "text-black" : "text-white"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className={
                          tier.popular ? "text-gray-700" : "text-gray-300"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card
                key={faq.id}
                className="bg-black border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      openFaq === faq.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === faq.id && (
                  <div className="px-6 pb-6 text-gray-300 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold">
            Ready to grow with TikTok?
          </h2>
          <p className="text-xl text-gray-300">
            Join 100+ businesses using AI TikTokz to drive traffic and sales
          </p>
          <Button
            onClick={handleGoogleSignup}
            disabled={isLoading}
            className="bg-white text-black hover:bg-gray-200 font-semibold px-12 py-6 text-lg"
          >
            {isLoading ? "Redirecting…" : "Get Started Now"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Product</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">AI TikTokz</h3>
            <p className="text-gray-400 text-sm">
              Done-for-you TikTok marketing that drives real results
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-gray-400 text-sm">
          © 2025 AI TikTokz. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
