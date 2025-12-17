"use client";

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Blocks } from 'lucide-react'





function AdminHeader() {
    // const { user, isLoaded } = useUser();
    const [isSticky, setIsSticky] = useState(false)
    const headerRef = useRef(null)

    useEffect(() => {
        const handleScroll = () => {
            console.log('Scroll Y:', window.scrollY)
            const shouldBeSticky = window.scrollY > 10
            setIsSticky(shouldBeSticky)
            if (headerRef.current) {
                console.log('Header position:', window.getComputedStyle(headerRef.current).position)
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="relative z-20 w-full">
            <div
                ref={headerRef}
                className={`flex items-center lg:justify-between justify-center bg-[#dbc59c] text-[#6b4f27] backdrop-blur-xl p-6 mb-4 rounded-lg border border-[#bfa77a] transition-all duration-300 ease-in-out z-50 w-full
                ${isSticky ? 'fixed top-0 left-0 right-0 shadow-lg opacity-95' : 'relative opacity-100'}`}
                style={isSticky ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, width: '100%' } : { width: '100%' }}
            >
                {/* Logo - Always visible with transition */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-3 group relative">
                        <div
                            className="absolute -inset-2 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 
                            group-hover:opacity-100 transition-all duration-1000 ease-in-out blur-xl"
                        />
                        <div
                            className="relative bg-linear-to-br from-[#1a1a2e] to-[#0a0a0f] p-2 rounded-xl ring-1
                            ring-white/10 group-hover:ring-white/20 transition-all duration-5000 ease-in-out"
                        >
                            <Blocks className="size-6 text-blue-400 transform -rotate-6 group-hover:rotate-0 transition-transform duration-1000 ease-in-out" />
                        </div>

                        <div className="flex flex-col">
                            <span className="block text-lg font-semibold text-[#6b4f27]">
                                CodeCraft
                            </span>
                            <span className="block text-xs text-[#bfa77a] font-medium">
                                Interactive Code Editor
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links for md and larger screens */}
                <div className="flex items-center gap-4 ml-auto">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                        {[{ href: '/dashboard', label: 'Dashboard' }, { href: '/projects', label: 'Projects' }, { href: '/users', label: 'Users' },{ href: '/meetings', label: 'Meetings' }].map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="relative uppercase tracking-wide transition-all duration-1000 group ease-in-out"
                            >
                                <span className="absolute -inset-1 rounded-md bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-md transition-all duration-1000 ease-in-out" />
                                <span className="relative z-10 bg-linear-to-r from-blue-400 via-blue-300 to-purple-400 text-transparent bg-clip-text group-hover:brightness-110 transition-all duration-1000 ease-in-out uppercase">
                                    {label}
                                </span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* <ModeToggle /> */}
                    </div>
                </div>

                <div className="pl-2 ">
                    {/* {user ? (
                        <HeaderProfileBtn />
                    ) : (
                        <TryUsOutButton/>
                    )}
                     */}
                    {/* <TryUsOutButton/> */}
                    
                </div>
            </div>
            {isSticky && (
                <div
                    className="from-[#0f0f1a] to-[#1a1a2e] bg-linear-to-r backdrop-blur-xl p-6 mb-4 rounded-lg invisible w-full transition-all duration-300 ease-in-out"
                />
            )}
        </div>
    )
}

export default AdminHeader