# -*- coding: utf-8 -*-
"""
Created on Sun Apr 20 00:24:05 2025

@author: Grant
"""
import apps.e7_utils.filter_utils as futils
import string
from apps.e7_utils.hero_manager import HeroManager
from apps.e7_utils.battle_manager import Battle
from collections import Counter
import re


ACCEPTED_CHARS = set('(),-.=; <>1234567890') | set(string.ascii_letters)

LEAGUES = {'master', 'champion', 'bronze', 'gold', 'silver', 'challenger', 'warlord', 'emperor', 'legend'}

PRINT_PREFIX = "   "

OPERATOR_MAP = {
    ">"     : lambda a, b: a > b,
    "<"     : lambda a, b: a < b,
    "="     : lambda a, b: a == b,
    "in"    : lambda a, b: a in b,
    ">="    : lambda a, b: a >= b,
    "<="    : lambda a, b: a <= b,
    "<>"    : lambda a, b: a != b,
    "<>in"  : lambda a, b: a not in b 
    }


def validate_chars(string):
    for c in string:
        if c not in ACCEPTED_CHARS:
            raise futils.SyntaxException(f"Input string contains disallowed character: {repr(c)}")
    return True


class Field:
    
    FIELD_MAP = {'battle-date'    : 'time',
                 'firstpick'      : 'firstpick',
                 'win'            : 'winner',
                 'victory-points' : ('scores', 0),
                 'p1.picks'       : 'p1_picks',
                 'p2.picks'       : 'p2_picks',
                 'p1.pick1'       : ('p1_picks', 0),
                 'p1.pick2'       : ('p1_picks', 1),
                 'p1.pick3'       : ('p1_picks', 2),
                 'p1.pick4'       : ('p1_picks', 3),
                 'p1.pick5'       : ('p1_picks', 4),
                 'p2.pick1'       : ('p2_picks', 0),
                 'p2.pick2'       : ('p2_picks', 1),
                 'p2.pick3'       : ('p2_picks', 2),
                 'p2.pick4'       : ('p2_picks', 3),
                 'p2.pick5'       : ('p2_picks', 4),
                 'p1.league'      : ('grades', 0),
                 'p2.league'      : ('grades', 1),
                 }
    
    def __init__(self, string):
        assert string in Field.FIELD_MAP, f"Not a valid field: {string}"
        self.string = string
        self.field = Field.FIELD_MAP[string]
        
    def get_field(self, battle: Battle):
        if isinstance(self.field, str):
            return getattr(battle, self.field)
        else:
            field, index = self.field
            if index >= len(getattr(battle, field)):
                return None
            return getattr(battle, field)[index]
        
    def as_str(self):
        return str(self.string)
            

class DataType:

    def __init__(self, data):
        self.validate(data)
        self.data = self.convert_data(data)
        
    def validate(self, data):
        raise NotImplementedError("validate not implemented for base DataType class")
        
    def convert_data(self, data):
        return data
        
    def as_str(self):
        return str(self.data)
    
        
VALID_INT_CHARS = "1234567890"

class Int(DataType):
    """
    Ints are also used as bools: 1 = True ; 2 = False
    """

    def __init__(self, data, bool_flag=False):
        self.bool_flag = bool_flag
        self.validate(data)
        self.data = self.convert_data(data)
    
    def validate(self, data):
        if not all(c in VALID_INT_CHARS for c in data):
            raise futils.ValidationError(f"Could not construct Int from {data}")
            
    def convert_data(self, data):
        return int(data)
    
    def as_str(self):
        if self.bool_flag is True:
            if self.data == 1:
                return "True"
            elif self.data == 2:
                return "False"
            else:
                raise RuntimeError(f"Bool flag was set to true, but the value was {self.data} ; can only be 1 or 2")
        return str(self.data)
        
            
VALID_STRING_CHARS = {' '} | set(string.ascii_letters)

class String(DataType):
    
    def __init__(self, data, HM: HeroManager):
        self.validate(data, HM)
        self.data = self.convert_data(data, HM)
    
    def validate(self, data, HM: HeroManager):
        if data == "":
            raise futils.ValidationError(f"Data cannot be empty for declared String type ; got : '{data}'")
        if not all(c in VALID_STRING_CHARS for c in data):
            raise futils.ValidationError(f"Invalid chars passed for Date type; can only pass letters; got: {data}")
        if not data in HM.name_dict and data not in LEAGUES:
            raise KeyError(f"'{data}' not found in valid list of Hero names or Leagues; String literals must only resolve to valid hero names or leagues")
    
    def convert_data(self, data, HM: HeroManager):
        if data in LEAGUES:
            return data
        else:
            return HM.name_str_map[data.title()]
    
VALID_DATE_CHARS = "1234567890-"
            
class Date(DataType):
    
    def validate(self, data):
        if not all(c in VALID_DATE_CHARS for c in data):
            raise futils.ValidationError(f"Invalid chars passed for Date type: {data}")
        counts = dict(Counter(data))
        if not counts["-"] == 2:
            raise futils.ValidationError(f"All dates must have two hyphens; got data: {data}")
        d = data.split("-")
        if len(d) != 3 or len(data) != 10 or len(d[0]) != 4 or len(d[1]) != 2:
            raise futils.ValidationError(f"All dates must be of the form YYYY-MM-DD; got data: {data}")
            
VALID_SET_CHARS = {','} | VALID_STRING_CHARS
            
class Set(DataType):
    
    def __init__(self, data, HM: HeroManager):
        self.validate(data, HM)
        self.data = self.convert_data(data, HM)
    
    def validate(self, data, HM: HeroManager):
        if data == "":
            raise futils.ValidationError(f"Data cannot be empty for declared Set type ; got : '{data}'")
        for c in data:
            if c not in VALID_SET_CHARS:
                raise futils.ValidationError(f"Invalid char passed for Set type: {c}")
        split = data.split(",")
        for s in split:
            try:
                s = String(s.strip(), HM)
            except Exception as E:
                raise futils.SyntaxException(f"Set should only have string literals as arguments; failed to convert '{s}' to String DataType ; Error: {E}")
        
    def convert_data(self, data, HM: HeroManager):
        data = data.split(",")
        print("CONVERTING DATA")
        data = {String(string.strip(), HM).data for string in data}
        return data

            
def convert_to_datatype(string, HM):
    if not any(T in string for T in ['int(', 'date(', 'set(', 'str(', 'true', 'false']):
        raise futils.SyntaxException(f"Could not recognize any valid data type declaration ; got : '{string}'")
    if string == 'true':
        return Int('1', bool_flag=True)
    if string == 'false':
        return Int('2', bool_flag=True)
    try:
        data = futils.retrieve_enclosure(string)
    except futils.SyntaxException as E:
        raise futils.SyntaxException(f"DataType was not properly formatted with enclosing brackets: {E}")
    if "date(" in string:
        return Date(data)
    elif "int(" in string:
        return Int(data)
    elif 'str(' in string:
        return String(data, HM)
    elif 'set(' in string:
        return Set(data, HM)
    raise futils.SyntaxException(f"Could not convert {string} to a valid DataType")
    

CLAUSE_FUNCTIONS = {"and", "or", "xor"}

class ClauseOperator:
    
    def __init__(self, fns: list[callable]):
        self.fns = fns
        
    def as_str(self, prefix=""):
        output = ''
        for f in self.fns:
            s = f.as_str(prefix=PRINT_PREFIX+prefix)
            output += f"{s},\n"
        return f"{prefix}{self.STR}(\n{output}{prefix})"
    
    

class AND(ClauseOperator):
    
    STR = "AND"
    
    def __call__(self, battle: Battle):
        return all(fn(battle) for fn in self.fns)
    
class OR(ClauseOperator):
    
    STR = "OR"
    
    def __call__(self, battle: Battle):
        return any(fn(battle) for fn in self.fns)
    
class XOR(ClauseOperator):
    
    STR = "XOR"
    
    def __call__(self, battle: Battle):
        return any(fn(battle) for fn in self.fns) and not all(fn(battle) for fn in self.fns)
    

class BaseFilter:
    
    def __init__(self, left: DataType | Field, operator, right: DataType | Field, split):
        self.left = left
        self.op_str = operator
        self.right = right
        self.split = split
        self.validate()

        
    def validate(self):
        if self.op_str == "in" or self.op_str == "<>in":
            if (isinstance(self.left, Field) and self.left.string in ['p1.picks', 'p2.picks']) or isinstance(self.left, Set):
                raise futils.SyntaxException(f"The left side of an 'in' or '<>in' operator cannot be a collection ; got: '{self.split[0]}'")
    
    def __call__(self, battle: Battle) -> bool:
        if isinstance(self.left, DataType):
            return OPERATOR_MAP[self.op_str](self.left.data, self.right.get_field(battle))
        else:
            return OPERATOR_MAP[self.op_str](self.left.get_field(battle), self.right.data)
        
    def as_str(self, prefix=""):
        left = self.left.as_str() if not isinstance(self.left, str) else self.left
        right = self.right.as_str() if not isinstance(self.right, str) else self.right
        return f"{prefix}{left} {self.op_str} {right}"
        
    
    
def get_underscore_substitute_str(string, pattern):
    old = re.search(pattern, string).group()
    new = old.replace(" ", "_")
    print(old, new)
    return old, new


class FilterSyntaxResolver:
    
    def __init__(self, syntax_str: str, HM: HeroManager):
        self.HM = HM
        print("RAW STRING:", repr(syntax_str))
        self.string = self.pre_parse(syntax_str)
        print("PRE PARSED STRING", repr(self.string))
        self.filters = self.parse(self.string)
        
    
    def as_str(self):
        output = ''
        for f in self.filters:
            s = f.as_str(prefix=PRINT_PREFIX)
            output += f"{s},\n"
        output = f"[\n{output}]"
        
        for str_id, name in self.HM.str_name_map.items():
            if re.search(str_id + "[ ']", output) is not None:
                output = output.replace(str_id, name)
        return output
        
    def pre_parse(self, string):
        string = string.replace("\n", "").replace("\t", "").replace("\r", "")
        string = re.sub("  +", "", string)
        validate_chars(string)
        string = string.lower()
        return string
    
    def parse_pure_filter(self, string):
        """
        parse a string with no clause functions or sub filters
        """
        string_flag = False
        set_flag = False
        if 'str(' in string:
            string_flag = True
            spaces_str, underscores_str = get_underscore_substitute_str(string, 'str\(.*?\)')
            string = string.replace(spaces_str, underscores_str)
        if 'set(' in string:
            set_flag = True
            spaces_set, underscores_set = get_underscore_substitute_str(string, 'set\(.*?\)')
            string = string.replace(spaces_set, underscores_set)
            
        split = string.split()
        print(split)
        if not len(split) == 3:
            raise futils.SyntaxException(f"Pure filters must be of the form: X oper Y ;  got: {split}")
        if string_flag:
            split = [elt.replace(underscores_str, spaces_str) for elt in split]
        if set_flag:
            split = [elt.replace(underscores_set, spaces_set) for elt in split]

        left, op, right = split
        if not op in OPERATOR_MAP:
            raise futils.SyntaxException(f"Operator: {op} is not valid; Pure filters must be of the form: X oper Y ;  got: {string}")
        if left in Field.FIELD_MAP:
            left = Field(left)
        if right in Field.FIELD_MAP:
            right = Field(right)
        if isinstance(right, Field) and isinstance(left, Field):
            raise futils.SyntaxException(f"Both sides of an operator cannot be fields. One must be a declared data type ; got {string}")
        
        elif not isinstance(right, Field) and not isinstance(left, Field):
            try:
                left = convert_to_datatype(left, self.HM)
            except futils.SyntaxException:
                 raise futils.SyntaxException(f"Left hand side of the operator could not be resolved to either a declared DataType or Field ; '{left}' from '{string}'")
            try:
                right = convert_to_datatype(right, self.HM)
            except futils.SyntaxException as E:
                raise futils.SyntaxException(f"Right hand side of the operator could not be resolved to either a declared DataType or Field ; '{right}' from '{string}'")
            raise futils.SyntaxException(f"One side of an operator must be a field ; got two declared data types: {string}")
        try:
            if isinstance(left, Field):
                right = convert_to_datatype(right, self.HM)
            else:
                left = convert_to_datatype(left, self.HM)
        except futils.SyntaxException as E:
            raise futils.SyntaxException(f"Either the left or right hand side of the operator must be a valid declared DataType ; {E}")
            
        
        if isinstance(left, Date):
            if not right.field == 'time':
                raise futils.SyntaxException(f"Date type can only be compared against battle-date field ; got field: '{right.string}' from '{string}'")
        elif isinstance(right, Date):
            if not left.field == 'time':
                raise futils.SyntaxException(f"Date type can only be compared against battle-date field ; got field: '{left.string}' from '{string}'")
        
            
            
        return [BaseFilter(left, op, right, split)]
        
        
    def parse_clause_function(self, fn_str, arguments):
        """
        parse a list of arguments using provided fn_str (either and, or, or xor)
        """
        fns = []
        for arg in arguments:
            fn = self.parse(arg)
            if isinstance(fn, list):
                fns += fn
            else:
                fns.append(fn)
        
        if fn_str == "and":
            return [AND(fns)]
        elif fn_str == "or":
            return [OR(fns)]
        elif fn_str == "xor":
            return [XOR(fns)]
        
        
    def parse(self, string):
        
        # empty string
        if string == "" or string is None:
            return []
        
        string = string.strip()
        
        parts = [elt for elt in string.split(';') if elt != ""]    
        
        print(parts, len(parts))
        
        # multiple filters need to be resolved
        if len(parts) > 1:
            filters = []
            for part in parts:
                filters += self.parse(part)
            
            return filters
        
        # one filter needs to be resolved
        
        # look for clause or data type
        filter_str = parts[0]
        split = filter_str.split("(")
        print(split)
        if split[0] == "":
            raise futils.SyntaxException("( must only follow DataType declaration or clause function declaration")
        elif split[0] in CLAUSE_FUNCTIONS:
            if split[-1][-1] != ")":
                raise futils.SyntaxException(f"Content immediately after clause functions must be wrapped in enclosing parentheses like 'and(...)'; ending ')' not present ; got: '{string}'")
            argument_str = futils.retrieve_enclosure(filter_str, "(", ")")  
            print(argument_str)
            arguments = [arg for arg in futils.retrieve_args(argument_str) if arg != ""]
            print(arguments)
            if not arguments:
                raise futils.SyntaxException("No arguments passed to clause function")
            return self.parse_clause_function(split[0], arguments)
        
        # we are parsing a pure filter with no sub filters
            
        else:
            return self.parse_pure_filter(filter_str)
        
if __name__ == "__main__":
    syntax_str = '''
            Int(2365) > victory-points;
            Date(2024-04-12) >= p1.picks;
            Str(Zio) <>in p1.picks;
            OR( DATE(2022-04-12) < battle-date, p1.league = Str(champion))
        '''
    HM = HeroManager()
    resolver = FilterSyntaxResolver(syntax_str, HM)
    print(resolver.as_str())
    