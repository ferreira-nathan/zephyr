import React from 'react'
import { NavLink } from 'react-router-dom'
import { BiMessageSquareDetail, BiUserPin, BiCalendarEvent, BiCog } from 'react-icons/bi'

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
        <BiMessageSquareDetail />
        <span>Chats</span>
      </NavLink>
      <NavLink to="/contacts" className={({ isActive }) => (isActive ? 'active' : '')}>
        <BiUserPin />
        <span>Contacts</span>
      </NavLink>
      <NavLink to="/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>
        <BiCalendarEvent />
        <span>Agenda</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
        <BiCog />
        <span>Réglages</span>
      </NavLink>
    </nav>
  )
}
