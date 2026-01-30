"use client";
import React, {useState, useEffect, JSX} from 'react';
import { useRouter } from 'next/navigation';
import componentStyles from '../styles/components.module.scss';
import companyLogo from '../Images/BMetrics-logo-removebg.png';
import farBars from '../Images/naviconrww752.png';
import Link from './Link';
import Button from './Button';
import {GetLoggedInUserStatus, GetAdminStatus} from '../function/VerificationCheck';

const Header: React.FC = () => {
    const navigate = useRouter();
    const userIsLoggedIn = GetLoggedInUserStatus();
    const userIsAdmin = GetAdminStatus();
    let phoneMenu = null;
    const [buttonLabel, setButtonLabel] = useState<string>('Login');
    const [links, setLinks] = useState<JSX.Element[]>([]);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    
    useEffect(() => {
        if (userIsLoggedIn) {
            setButtonLabel('Logout');
            const userLinks = [
                <li key="dashboard"><Link href='/Dashboard' hrefType='link' placeholder="Dashboard" /></li>,
                <li key="behavior"><Link href='/Behavior' hrefType='link' placeholder="Behaviors" /></li>,
                // <li key="skill"><Link href='/Skill' hrefType='link' placeholder="Skills" /></li>,
                <li key="session-notes"><Link href='/SessionNotes' hrefType='link' placeholder="Session Notes" /></li>,
                <li key="dataEntry"><Link href='/DataEntry' hrefType='link' placeholder="Data Entry" /></li>,
            ];
            if (userIsAdmin) {
                userLinks.push(<li key="admin"><Link href='/Admin' hrefType='link' placeholder="Admin" /></li>);
            }
            setLinks(userLinks);
        } else {
            setButtonLabel('Login');
            setLinks([
                <li key="home"><Link href='/' hrefType='link' placeholder="Home"/></li>,
                <li key="about"><Link href='/About' hrefType='link' placeholder="About us"/></li>,
                <li key="contact"><Link href='/Contact' hrefType='link' placeholder="Contact us"/></li>
            ]);
        }
    }, [userIsLoggedIn]);

    const routeChange = () => {
        if (userIsLoggedIn) {
            navigate.push('/Logout');
        }
        else {
            navigate.push('/Login');
        }
    }
      
    const showPhoneMenuBoolean = () => {
        if (!showMenu){
            setShowMenu(true);
        }
        else {
            setShowMenu(false);
        }
    }

    if (showMenu){
        phoneMenu = 
        <nav className={componentStyles.mobileNav}>
            <ul>
                {links}
            </ul>
        </nav>
    }

    return (
        <div className={componentStyles.headerBody}>
            <a href={userIsLoggedIn ? '/Dashboard' : '/'}><img src={companyLogo.src} alt ="BMetrics Logo" /></a>
            <h1 className={componentStyles.companyName}>BMetrics <span className={componentStyles.trade}>&trade;</span></h1>
            <img className={componentStyles.farBars} src={farBars.src} alt ="FarBar Button" onClick={showPhoneMenuBoolean}/>
            <div className={componentStyles.headerButtons}>
                {!userIsLoggedIn && <Button nameOfClass='signupButton' placeholder='Sign Up' btnType='button' onClick={() => navigate.push('/SignUp')}/> }
                <Button nameOfClass='loginButton' placeholder={buttonLabel} btnType='button' onClick={routeChange}/>
            </div>
            {phoneMenu}
            <nav>
                <ul>
                    {links}
                </ul>
            </nav>
        </div>
    );
}

export default Header;