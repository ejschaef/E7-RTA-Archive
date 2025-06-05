# -*- coding: utf-8 -*-
"""
Created on Sun Apr 20 01:14:27 2025

@author: Grant
"""
        
class SyntaxException(Exception):
    
    def __init__(self, message):
        super().__init__(message)

class TypeException(Exception):
    
    def __init__(self, message):
        super().__init__(message)
        
class ValidationError(Exception):
    
    def __init__(self, message):
        super().__init__(message)
    

def retrieve_enclosure(string, open_char='(', close_char=')'):
    assert open_char != close_char, f"Must pass different charcters for retrieve_enclosure: {open_char} = {close_char}"
    started = False
    count = 0
    output = ""
    for i, char in enumerate(string):
        if char == open_char:
            count += 1
            if started is False:
                started = True
                continue
        elif char == close_char:
            count -= 1
        if count == 0 and started is True:
            if i != len(string) -1:
                raise SyntaxException(f"Enclosure should not be resolve before end of string; resolved at index: {i}; input string: {string}")
            return output
        elif started is True:
            output += char
    if started is False:
        raise SyntaxException(f"Enclosure of type {open_char}...{close_char} not found in string ; resolved at index: {i}; input string: {string}")
    if count > 0:
        raise SyntaxException(f"Enclosure could not be resolved; too many '{open_char}'; balance = +{count}; input string {string}")
    if count < 0:
        raise SyntaxException(f"Enclosure could not be resolved; too many '{close_char}'; balance = -{count}; input string {string}")
    
def retrieve_args(string):
    open_parenthese_count = 0
    args = []
    arg = ""
    for c in string:
        if c == "(":
            open_parenthese_count += 1
        elif c == ")":
            open_parenthese_count -= 1
        elif c == ",":
            if open_parenthese_count == 0:
                args.append(arg)
                arg = ""
                continue
        arg += (c)
    if arg:
        args.append(arg)
    return args
        
    
    
    
    
if __name__ == "__main__":
    sub_str = retrieve_enclosure("(adu(sodi()ua))o(sd as()(())iodj)", "(", ")")
